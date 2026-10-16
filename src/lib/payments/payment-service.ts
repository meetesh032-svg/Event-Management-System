import { db } from "@/db";
import {
  events,
  bookings,
  users,
  coupons,
  seatReservations,
  paymentLogs,
  webhookLogs,
  refunds,
  auditLogs,
  orders,
  payments,
  transactions,
  invoices,
  receipts,
} from "@/db/schema";
import { and, eq, inArray, sql, lt } from "drizzle-orm";
import { paymentRegistry } from "./registry";
import {
  PaymentGatewayId,
  FeeBreakdown,
  CreatePaymentOrderInput,
  PaymentOrderResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
  RefundPaymentInput,
  RefundPaymentResult,
  WebhookVerificationInput,
  WebhookEventResult,
} from "./types";
import { generateQRCodeBuffer } from "@/lib/qr";
import { generateTicketPDF } from "@/lib/pdf";
import { sendTicketEmail } from "@/lib/email";
import crypto from "crypto";

export class PaymentService {
  /**
   * Transparent backend fee calculation.
   * Final Amount = Ticket Price × Quantity + Platform Fee + Convenience Fee + Taxes - Coupon Discount - Promotion Discount - Wallet Balance
   * Never trust values received from frontend!
   */
  public calculateFeeBreakdown(params: {
    subtotalCents: number;
    discountCents?: number;
    couponCode?: string | null;
    promotionDiscountCents?: number;
    walletBalanceCents?: number;
    useWallet?: boolean;
  }): FeeBreakdown & { promotionDiscountCents: number; walletDeductionCents: number } {
    const { subtotalCents } = params;
    const discountCents = params.discountCents || 0;
    const promotionDiscountCents = params.promotionDiscountCents || 0;

    const totalDiscounts = discountCents + promotionDiscountCents;
    const discountedBase = Math.max(0, subtotalCents - totalDiscounts);

    // Platform and convenience fee standards (₹5 platform, ₹25 convenience per order)
    const platformFeeCents = subtotalCents > 0 ? 500 : 0; // ₹5.00
    const convenienceFeeCents = subtotalCents > 0 ? 2500 : 0; // ₹25.00

    // 18% GST applicable on platform & convenience fees
    const taxableFee = platformFeeCents + convenienceFeeCents;
    const taxesCents = subtotalCents > 0 ? Math.round((taxableFee * 18) / 100) : 0;

    const payableBeforeWallet = discountedBase + platformFeeCents + convenienceFeeCents + taxesCents;

    let walletDeductionCents = 0;
    if (params.useWallet && params.walletBalanceCents && params.walletBalanceCents > 0) {
      walletDeductionCents = Math.min(payableBeforeWallet, params.walletBalanceCents);
    }

    const totalAmountCents = Math.max(0, payableBeforeWallet - walletDeductionCents);

    return {
      subtotalCents,
      taxesCents,
      taxRatePercent: 18,
      platformFeeCents,
      convenienceFeeCents,
      discountCents,
      promotionDiscountCents,
      walletDeductionCents,
      couponCode: params.couponCode || null,
      totalAmountCents,
    };
  }

  /**
   * Initiate an official payment order across any supported gateway.
   * Reserves seats temporarily (TTL 10 min), calculates backend grand total,
   * creates order record in database, and generates official gateway session/order.
   */
  public async createCheckoutOrder(params: {
    eventId: number;
    userId: number;
    customer: { name: string; email: string; phone?: string };
    quantity: number;
    seatNumbers?: string[];
    couponCode?: string;
    gatewayId: PaymentGatewayId;
    returnUrl: string;
    cancelUrl: string;
    isGuest?: boolean;
    useWallet?: boolean;
  }): Promise<{ orderResult: PaymentOrderResult; feeBreakdown: FeeBreakdown; event: any; orderId: string }> {
    const { eventId, userId, customer, seatNumbers, couponCode, gatewayId, returnUrl, cancelUrl, useWallet } = params;

    // First auto-clean any expired held seats & pending orders
    this.releaseExpiredOrdersAndSeats().catch(() => {});

    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!event) {
      throw new Error("Event not found");
    }

    if (event.ticketsRemaining < 1) {
      throw new Error("This event is completely sold out");
    }

    const reqQuantity = Math.max(1, Number(params.quantity) || 1);
    let subtotalCents = event.ticketPriceCents * reqQuantity;
    let validatedSeats: string[] = [];

    // Early Bird promotion check
    let promotionDiscountCents = 0;
    if (event.earlyBirdCutoff && new Date() < new Date(event.earlyBirdCutoff) && event.earlyBirdDiscountPercent > 0) {
      promotionDiscountCents = Math.round((subtotalCents * event.earlyBirdDiscountPercent) / 100);
    }

    // Temporary Seat Reservation (Hold TTL: 10 minutes)
    const holdUntil = new Date(Date.now() + 10 * 60 * 1000);

    if (Array.isArray(seatNumbers) && seatNumbers.length > 0) {
      validatedSeats = seatNumbers.map((s) => s.trim().toUpperCase());
      const now = new Date();

      // Check if any seat is already booked or held by another user
      const existingHolds = await db.query.seatReservations.findMany({
        where: and(
          eq(seatReservations.eventId, event.id),
          inArray(seatReservations.seatNumber, validatedSeats)
        ),
      });

      for (const hold of existingHolds) {
        if (hold.status === "booked") {
          throw new Error(`Seat ${hold.seatNumber} is already booked. Please choose another seat.`);
        }
        if (hold.status === "held" && hold.userId !== userId && hold.heldUntil && new Date(hold.heldUntil) > now) {
          throw new Error(`Seat ${hold.seatNumber} is currently held by another customer. Please choose another seat.`);
        }
      }

      // Hold or refresh holds for these seats
      for (const seatNum of validatedSeats) {
        const existingHold = existingHolds.find((h) => h.seatNumber === seatNum && h.userId === userId);
        if (existingHold) {
          await db
            .update(seatReservations)
            .set({ status: "held", heldUntil: holdUntil, updatedAt: new Date() })
            .where(eq(seatReservations.id, existingHold.id));
        } else {
          await db.insert(seatReservations).values({
            eventId: event.id,
            seatNumber: seatNum,
            userId,
            tier: "standard",
            priceCents: event.ticketPriceCents,
            status: "held",
            heldUntil: holdUntil,
          });
        }
      }

      subtotalCents = event.ticketPriceCents * validatedSeats.length;
    } else {
      if (event.ticketsRemaining < reqQuantity) {
        throw new Error(`Only ${event.ticketsRemaining} ticket(s) remaining for this show`);
      }
    }

    // Backend Coupon Validation
    let discountCents = 0;
    let appliedCoupon: string | null = null;

    if (couponCode) {
      const codeClean = couponCode.trim().toUpperCase();
      const coupon = await db.query.coupons.findFirst({
        where: and(eq(coupons.code, codeClean), eq(coupons.isActive, true)),
      });

      if (coupon && subtotalCents >= coupon.minOrderCents) {
        if (coupon.discountType === "percentage") {
          discountCents = Math.round((subtotalCents * coupon.discountValue) / 100);
          if (coupon.maxDiscountCents && discountCents > coupon.maxDiscountCents) {
            discountCents = coupon.maxDiscountCents;
          }
        } else {
          discountCents = coupon.discountValue;
        }
        discountCents = Math.min(discountCents, subtotalCents);
        appliedCoupon = coupon.code;
      }
    }

    // User wallet balance
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    const userWalletBalance = user?.walletBalanceCents || 0;

    const breakdown = this.calculateFeeBreakdown({
      subtotalCents,
      discountCents,
      couponCode: appliedCoupon,
      promotionDiscountCents,
      walletBalanceCents: userWalletBalance,
      useWallet,
    });

    const effectiveGatewayId: PaymentGatewayId = breakdown.totalAmountCents === 0 ? "free" : gatewayId;
    const provider = paymentRegistry.getProvider(effectiveGatewayId);

    const orderId = `ORD-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    // 1. Persist Pending Order in Database
    const [dbOrder] = await db
      .insert(orders)
      .values({
        orderId,
        eventId: event.id,
        userId,
        gateway: effectiveGatewayId,
        quantity: reqQuantity,
        seats: validatedSeats.length ? JSON.stringify(validatedSeats) : null,
        subtotalCents: breakdown.subtotalCents,
        platformFeeCents: breakdown.platformFeeCents,
        convenienceFeeCents: breakdown.convenienceFeeCents,
        taxesCents: breakdown.taxesCents,
        discountCents: breakdown.discountCents + breakdown.promotionDiscountCents,
        walletAmountCents: breakdown.walletDeductionCents,
        totalAmountCents: breakdown.totalAmountCents,
        currency: "INR",
        status: "pending",
        couponCode: appliedCoupon,
        customerDetails: JSON.stringify(customer),
        expiresAt: holdUntil,
      })
      .returning();

    // 2. Call Official Provider Order Creation
    const orderInput: CreatePaymentOrderInput = {
      orderId,
      amountCents: breakdown.totalAmountCents,
      currency: "INR",
      description: `Gatherly Tickets - ${event.title}`,
      customer: {
        ...customer,
        userId,
      },
      items: [
        {
          title: event.title,
          quantity: reqQuantity,
          unitPriceCents: event.ticketPriceCents,
          totalPriceCents: subtotalCents,
        },
      ],
      metadata: {
        orderId,
        eventId: event.id,
        userId,
        seats: validatedSeats,
        quantity: reqQuantity,
        couponCode: appliedCoupon,
        discountCents,
        subtotalCents,
        taxesCents: breakdown.taxesCents,
        convenienceFeeCents: breakdown.convenienceFeeCents,
        isGuest: params.isGuest || false,
      },
      returnUrl,
      cancelUrl,
    };

    const orderResult = await provider.createOrder(orderInput);

    // 3. Update Order with Gateway Return Data
    await db
      .update(orders)
      .set({
        gatewayOrderId: orderResult.gatewayOrderId,
        clientSecret: orderResult.clientSecret,
        checkoutUrl: orderResult.checkoutUrl,
        gatewayPayload: orderResult.gatewayPayload ? JSON.stringify(orderResult.gatewayPayload) : null,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, dbOrder.id));

    // 4. Log Initiated Payment
    await db.insert(payments).values({
      orderId,
      userId,
      gateway: effectiveGatewayId,
      gatewayPaymentId: orderResult.gatewayOrderId || orderId,
      gatewayOrderId: orderResult.gatewayOrderId,
      amountCents: breakdown.totalAmountCents,
      currency: "INR",
      status: "initiated",
      paymentMethod: provider.getUIInfo().category,
    });

    await db.insert(paymentLogs).values({
      userId,
      gateway: effectiveGatewayId,
      transactionId: orderResult.gatewayOrderId,
      amountCents: breakdown.totalAmountCents,
      status: "initiated",
      paymentMethodDetails: JSON.stringify({
        orderId,
        gateway: effectiveGatewayId,
        breakdown,
      }),
    });

    return { orderResult, feeBreakdown: breakdown, event, orderId };
  }

  /**
   * Verify and atomically complete payment on backend.
   * Strictly matches the verified order amount with the database order,
   * generates official booking, tax invoice, payment receipt, and QR passes.
   */
  public async verifyAndCompletePayment(params: {
    gatewayId: PaymentGatewayId;
    verifyInput: VerifyPaymentInput;
  }) {
    const { gatewayId, verifyInput } = params;
    const provider = paymentRegistry.getProvider(gatewayId);

    // 1. Find Order from Database
    const dbOrder = await db.query.orders.findFirst({
      where: and(
        eq(orders.orderId, verifyInput.orderId)
      ),
    });

    if (!dbOrder) {
      // Check if this payment was already completed and booking created (idempotency check)
      const existingBooking = await db.query.bookings.findFirst({
        where: eq(bookings.stripeSessionId, verifyInput.gatewayPaymentId || verifyInput.orderId),
      });
      if (existingBooking) {
        return { booking: existingBooking, isDuplicate: true };
      }
      throw new Error(`Order "${verifyInput.orderId}" not found in database.`);
    }

    // If order was already completed, return existing booking
    if (dbOrder.status === "completed") {
      const existingBooking = await db.query.bookings.findFirst({
        where: eq(bookings.stripeSessionId, verifyInput.gatewayPaymentId || verifyInput.orderId),
      });
      if (existingBooking) {
        return { booking: existingBooking, isDuplicate: true };
      }
    }

    // 2. Strict Backend Amount Verification
    // Pass the exact database order amount to provider verification
    const verifiedInput: VerifyPaymentInput = {
      ...verifyInput,
      amountCents: dbOrder.totalAmountCents,
    };

    // 3. Call Provider Gateway Verification
    const verification = await provider.verifyPayment(verifiedInput);
    if (!verification.success) {
      // Mark order as failed and release held seats automatically
      await db
        .update(orders)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(orders.id, dbOrder.id));

      await db
        .update(payments)
        .set({ status: "failed", errorMessage: verification.errorMessage })
        .where(eq(payments.orderId, dbOrder.orderId));

      await this.releaseHeldSeats(dbOrder.eventId, dbOrder.userId, dbOrder.seats);

      throw new Error(verification.errorMessage || "Payment verification failed at gateway");
    }

    // 4. Atomic Database Transaction: Confirm Booking, Issue Invoice & Receipt
    return await db.transaction(async (tx) => {
      // Check idempotency again inside transaction
      const existing = await tx.query.bookings.findFirst({
        where: eq(bookings.stripeSessionId, verification.transactionId || verifyInput.gatewayPaymentId || dbOrder.orderId),
      });
      if (existing) {
        return { booking: existing, isDuplicate: true, verification };
      }

      const event = await tx.query.events.findFirst({
        where: eq(events.id, dbOrder.eventId!),
      });
      const user = await tx.query.users.findFirst({
        where: eq(users.id, dbOrder.userId!),
      });

      if (!event || !user) {
        throw new Error("Event or attendee not found");
      }

      const reference = `EVT-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      let seatList: string[] = [];
      if (dbOrder.seats) {
        try {
          seatList = JSON.parse(dbOrder.seats);
        } catch {
          seatList = dbOrder.seats.split(",").map((s) => s.trim());
        }
      }

      // Customer metadata
      let customerName = user.name;
      let customerEmail = user.email;
      if (dbOrder.customerDetails) {
        try {
          const cust = JSON.parse(dbOrder.customerDetails);
          if (cust.name) customerName = cust.name;
          if (cust.email) customerEmail = cust.email;
        } catch {}
      }

      // Create Booking Record
      const [booking] = await tx
        .insert(bookings)
        .values({
          reference,
          eventId: event.id,
          userId: user.id,
          stripeSessionId: verification.transactionId || verifyInput.gatewayPaymentId || dbOrder.orderId,
          quantity: dbOrder.quantity,
          totalCents: dbOrder.totalAmountCents,
          status: "confirmed",
          seats: seatList.length ? JSON.stringify(seatList) : null,
          couponCode: dbOrder.couponCode || null,
          discountCents: dbOrder.discountCents || 0,
          isGuest: user.passwordHash === "GUEST_UNREGISTERED",
          guestEmail: user.passwordHash === "GUEST_UNREGISTERED" ? customerEmail : null,
          guestName: user.passwordHash === "GUEST_UNREGISTERED" ? customerName : null,
        })
        .returning();

      // Update Order Status to Completed
      await tx
        .update(orders)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(orders.id, dbOrder.id));

      // Record Succeeded Payment
      await tx.insert(payments).values({
        orderId: dbOrder.orderId,
        bookingId: booking.id,
        userId: user.id,
        gateway: gatewayId,
        gatewayPaymentId: verification.transactionId,
        gatewayOrderId: dbOrder.gatewayOrderId,
        amountCents: dbOrder.totalAmountCents,
        currency: "INR",
        status: "succeeded",
        paymentMethod: verification.paymentMethodDetails?.method || gatewayId,
        paymentMethodDetails: JSON.stringify(verification.paymentMethodDetails || {}),
      });

      // Record Formal Financial Transaction
      const txnRef = `TXN-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      await tx.insert(transactions).values({
        transactionReference: txnRef,
        orderId: dbOrder.orderId,
        bookingId: booking.id,
        userId: user.id,
        gateway: gatewayId,
        type: "charge",
        amountCents: dbOrder.totalAmountCents,
        currency: "INR",
        status: "succeeded",
        gatewayResponse: JSON.stringify(verification),
      });

      // Transition Held Seats to Booked
      if (seatList.length > 0) {
        await tx
          .update(seatReservations)
          .set({
            status: "booked",
            bookingId: booking.id,
            heldUntil: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(seatReservations.eventId, event.id),
              eq(seatReservations.userId, user.id),
              inArray(seatReservations.seatNumber, seatList)
            )
          );
      }

      // Decrement Available Tickets
      await tx
        .update(events)
        .set({ ticketsRemaining: Math.max(0, event.ticketsRemaining - dbOrder.quantity) })
        .where(eq(events.id, event.id));

      // Debit Wallet if Wallet balance was used
      if (dbOrder.walletAmountCents > 0) {
        await tx
          .update(users)
          .set({
            walletBalanceCents: sql`GREATEST(0, COALESCE(${users.walletBalanceCents}, 0) - ${dbOrder.walletAmountCents})`,
          })
          .where(eq(users.id, user.id));
      }

      // Increment Coupon usedCount if applied
      if (dbOrder.couponCode) {
        await tx
          .update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1` })
          .where(eq(coupons.code, dbOrder.couponCode));
      }

      // Generate Formal Tax Invoice Record
      const invoiceNumber = `INV-${booking.reference}`;
      await tx.insert(invoices).values({
        invoiceNumber,
        bookingId: booking.id,
        userId: user.id,
        eventId: event.id,
        subtotalCents: dbOrder.subtotalCents,
        platformFeeCents: dbOrder.platformFeeCents,
        convenienceFeeCents: dbOrder.convenienceFeeCents,
        taxesCents: dbOrder.taxesCents,
        discountCents: dbOrder.discountCents,
        totalCents: dbOrder.totalAmountCents,
        currency: "INR",
        status: "paid",
      });

      // Generate Formal Payment Receipt Record
      const receiptNumber = `RCP-${booking.reference}`;
      await tx.insert(receipts).values({
        receiptNumber,
        bookingId: booking.id,
        orderId: dbOrder.orderId,
        transactionId: verification.transactionId,
        userId: user.id,
        amountCents: dbOrder.totalAmountCents,
        currency: "INR",
        paymentMethod: verification.paymentMethodDetails?.method || gatewayId,
        gateway: gatewayId,
        status: "completed",
      });

      // Record Audit Log
      await tx.insert(auditLogs).values({
        actorId: user.id,
        action: "PAYMENT_VERIFIED_AND_CONFIRMED",
        targetType: "booking",
        targetId: booking.id.toString(),
        details: JSON.stringify({
          gateway: gatewayId,
          orderId: dbOrder.orderId,
          transactionId: verification.transactionId,
          amountCents: dbOrder.totalAmountCents,
          reference: booking.reference,
        }),
      });

      // Generate QR Pass and send Ticket Confirmation Email asynchronously
      const qrBuffer = await generateQRCodeBuffer(booking.reference);
      const pdfPrice = event.ticketPriceCents === 0 ? "Free" : `Rs. ${(event.ticketPriceCents / 100).toLocaleString("en-IN")}`;
      const formattedTotal = dbOrder.totalAmountCents === 0 ? "Free" : `₹${(dbOrder.totalAmountCents / 100).toLocaleString("en-IN")}`;

      generateTicketPDF({
        eventTitle: event.title,
        eventDescription: event.description,
        eventLocation: event.location,
        eventDate: new Date(event.startsAt).toLocaleString("en-IN"),
        attendeeName: customerName,
        attendeeEmail: customerEmail,
        reference: booking.reference,
        quantity: booking.quantity,
        seats: seatList,
        qrBuffer,
        price: pdfPrice,
      })
        .then((pdfBuffer) => {
          sendTicketEmail({
            to: customerEmail,
            subject: `Confirmed: Tickets for ${event.title} (${booking.reference})`,
            html: `
              <h2>Booking Confirmed for ${customerName}!</h2>
              <p>Your booking reference is <strong>${booking.reference}</strong>.</p>
              <p>Show: <strong>${event.title}</strong><br/>
                 Venue: ${event.location}<br/>
                 Date: ${new Date(event.startsAt).toLocaleString("en-IN")}<br/>
                 Total Paid: <strong>${formattedTotal}</strong> via ${gatewayId.toUpperCase()}
              </p>
              ${seatList.length ? `<p>Reserved Seats: <strong>${seatList.join(", ")}</strong></p>` : ""}
              <p>Your official entry ticket with digital QR pass and Tax Invoice are attached.</p>
            `,
            pdfBuffer,
            reference: booking.reference,
          }).catch((err) => console.warn("Failed sending ticket email:", err));
        })
        .catch((err) => console.warn("Failed generating ticket PDF:", err));

      // Multi-channel notifications
      import("@/lib/notification-service")
        .then(({ notifyBookingConfirmed }) => {
          notifyBookingConfirmed(
            {
              id: booking.id,
              reference: booking.reference,
              totalCents: booking.totalCents,
              quantity: booking.quantity,
              seats: booking.seats,
            },
            event,
            user
          ).catch(() => {});
        })
        .catch(() => {});

      return {
        booking,
        invoiceNumber,
        receiptNumber,
        isDuplicate: false,
        verification,
      };
    });
  }

  /**
   * Automatically release seats held by a user for an event if payment is cancelled or failed.
   */
  public async releaseHeldSeats(eventId?: number | null, userId?: number | null, seatsJson?: string | null) {
    if (!eventId || !userId || !seatsJson) return;
    try {
      let seatList: string[] = [];
      try {
        seatList = JSON.parse(seatsJson);
      } catch {
        seatList = seatsJson.split(",").map((s) => s.trim());
      }

      if (seatList.length > 0) {
        await db
          .update(seatReservations)
          .set({ status: "released", heldUntil: null, updatedAt: new Date() })
          .where(
            and(
              eq(seatReservations.eventId, eventId),
              eq(seatReservations.userId, userId),
              eq(seatReservations.status, "held"),
              inArray(seatReservations.seatNumber, seatList)
            )
          );
      }
    } catch (err) {
      console.warn("Failed to release held seats:", err);
    }
  }

  /**
   * Automatically release expired pending orders and their held seats.
   */
  public async releaseExpiredOrdersAndSeats(): Promise<number> {
    try {
      const now = new Date();
      const expiredPendingOrders = await db.query.orders.findMany({
        where: and(eq(orders.status, "pending"), lt(orders.expiresAt, now)),
      });

      for (const order of expiredPendingOrders) {
        await db
          .update(orders)
          .set({ status: "expired", updatedAt: now })
          .where(eq(orders.id, order.id));

        await db
          .update(payments)
          .set({ status: "expired" })
          .where(eq(payments.orderId, order.orderId));

        if (order.seats && order.eventId && order.userId) {
          await this.releaseHeldSeats(order.eventId, order.userId, order.seats);
        }
      }

      return expiredPendingOrders.length;
    } catch (err) {
      console.warn("Failed running cleanup for expired orders:", err);
      return 0;
    }
  }

  /**
   * Cancel an order explicitly by user or gateway timeout.
   */
  public async cancelOrder(orderId: string, userId?: number, reason = "User cancelled payment"): Promise<boolean> {
    const order = await db.query.orders.findFirst({
      where: eq(orders.orderId, orderId),
    });

    if (!order) return false;
    if (order.status === "completed") {
      throw new Error("Cannot cancel an order that has already been completed.");
    }

    await db
      .update(orders)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    await db
      .update(payments)
      .set({ status: "cancelled", errorMessage: reason })
      .where(eq(payments.orderId, order.orderId));

    if (order.seats && order.eventId && order.userId) {
      await this.releaseHeldSeats(order.eventId, order.userId, order.seats);
    }

    return true;
  }

  /**
   * Process refund through official gateway.
   */
  public async processRefund(params: {
    bookingId: number;
    amountCents?: number;
    reason?: string;
  }): Promise<RefundPaymentResult> {
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, params.bookingId),
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.refundStatus === "refunded") {
      throw new Error("Booking has already been fully refunded");
    }

    const refundAmount = params.amountCents || booking.totalCents;
    const reason = params.reason || "Customer cancellation requested";

    const lastPayment = await db.query.payments.findFirst({
      where: and(eq(payments.bookingId, booking.id), eq(payments.status, "succeeded")),
      orderBy: (pay, { desc }) => [desc(pay.createdAt)],
    });

    const gatewayId = (lastPayment?.gateway || "wallet") as PaymentGatewayId;
    const provider = paymentRegistry.getProvider(gatewayId);

    const refundResult = await provider.refund({
      transactionId: lastPayment?.gatewayPaymentId || booking.stripeSessionId,
      amountCents: refundAmount,
      reason,
      bookingId: booking.id,
    });

    if (refundResult.success) {
      await db.insert(refunds).values({
        bookingId: booking.id,
        userId: booking.userId,
        gateway: gatewayId,
        transactionId: lastPayment?.gatewayPaymentId || booking.stripeSessionId,
        refundId: refundResult.refundId,
        amountCents: refundAmount,
        currency: "INR",
        reason,
        status: "succeeded",
      });

      const refundTxnRef = `TXN-REF-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      await db.insert(transactions).values({
        transactionReference: refundTxnRef,
        bookingId: booking.id,
        userId: booking.userId,
        gateway: gatewayId,
        type: "refund",
        amountCents: refundAmount,
        currency: "INR",
        status: "succeeded",
        gatewayResponse: JSON.stringify(refundResult),
      });

      const isFull = refundAmount >= booking.totalCents;
      await db
        .update(bookings)
        .set({
          refundStatus: isFull ? "refunded" : "partially_refunded",
          refundAmountCents: (booking.refundAmountCents || 0) + refundAmount,
          cancellationReason: reason,
        })
        .where(eq(bookings.id, booking.id));

      if (gatewayId === "wallet" && refundAmount > 0) {
        await db
          .update(users)
          .set({
            walletBalanceCents: sql`COALESCE(${users.walletBalanceCents}, 0) + ${refundAmount}`,
          })
          .where(eq(users.id, booking.userId));
      }
    }

    return refundResult;
  }

  /**
   * Handle incoming webhooks across all providers.
   */
  public async handleWebhook(gatewayId: PaymentGatewayId, input: WebhookVerificationInput) {
    const provider = paymentRegistry.getProvider(gatewayId);
    let eventResult: WebhookEventResult = { isValid: false, eventType: "unknown" };

    if (provider.verifyWebhook) {
      eventResult = await provider.verifyWebhook(input);
    } else {
      eventResult = { isValid: true, eventType: "payment.succeeded" };
    }

    await db.insert(webhookLogs).values({
      gateway: gatewayId,
      eventType: eventResult.eventType,
      payload: input.rawBody.slice(0, 5000),
      signature: typeof input.headers["x-signature"] === "string" ? input.headers["x-signature"] : null,
      status: eventResult.isValid ? "processed" : "failed",
      errorMessage: eventResult.error || null,
    });

    // If webhook reports payment success and we have orderId, ensure booking is completed
    if (eventResult.isValid && eventResult.eventType === "payment.succeeded" && eventResult.orderId) {
      try {
        const order = await db.query.orders.findFirst({
          where: eq(orders.orderId, eventResult.orderId),
        });

        if (order && order.status === "pending") {
          await this.verifyAndCompletePayment({
            gatewayId,
            verifyInput: {
              orderId: order.orderId,
              gatewayPaymentId: eventResult.transactionId || order.gatewayOrderId || order.orderId,
              gatewayOrderId: order.gatewayOrderId || undefined,
              amountCents: order.totalAmountCents,
            },
          });
        }
      } catch (err) {
        console.warn("Webhook auto-confirmation note:", err);
      }
    }

    return eventResult;
  }
}

export const paymentService = new PaymentService();
