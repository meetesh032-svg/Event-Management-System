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
} from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
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
   * Calculate transparent fee breakdown: subtotal, taxes (GST 18%), platform fee, and discounts.
   */
  public calculateFeeBreakdown(
    subtotalCents: number,
    discountCents = 0,
    couponCode: string | null = null
  ): FeeBreakdown {
    const discountedBase = Math.max(0, subtotalCents - discountCents);
    
    // In BookMyShow / Indian ticketing, convenience fee is typically ₹25 per booking if non-zero
    const convenienceFeeCents = subtotalCents > 0 ? 2500 : 0; // ₹25.00
    const platformFeeCents = subtotalCents > 0 ? 500 : 0; // ₹5.00

    // 18% GST applicable on convenience & platform fee as per Indian tax norms
    const taxableFee = convenienceFeeCents + platformFeeCents;
    const taxesCents = subtotalCents > 0 ? Math.round((taxableFee * 18) / 100) : 0;

    const totalAmountCents = discountedBase + convenienceFeeCents + platformFeeCents + taxesCents;

    return {
      subtotalCents,
      taxesCents,
      taxRatePercent: 18,
      platformFeeCents,
      convenienceFeeCents,
      discountCents,
      couponCode,
      totalAmountCents,
    };
  }

  /**
   * Initiate a payment order across any of the 10+ supported payment gateways.
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
  }): Promise<{ orderResult: PaymentOrderResult; feeBreakdown: FeeBreakdown; event: any }> {
    const { eventId, userId, customer, seatNumbers, couponCode, gatewayId, returnUrl, cancelUrl } = params;

    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!event) {
      throw new Error("Event not found");
    }

    if (event.ticketsRemaining < 1) {
      throw new Error("Event is sold out");
    }

    let subtotalCents = event.ticketPriceCents * params.quantity;
    let validatedSeats: string[] = [];

    // Verify held seats if specific seat numbers were provided
    if (Array.isArray(seatNumbers) && seatNumbers.length > 0) {
      validatedSeats = seatNumbers.map((s) => s.trim().toUpperCase());
      const now = new Date();

      const userHolds = await db.query.seatReservations.findMany({
        where: and(
          eq(seatReservations.eventId, event.id),
          eq(seatReservations.userId, userId),
          eq(seatReservations.status, "held"),
          sql`${seatReservations.heldUntil} > ${now}`,
          inArray(seatReservations.seatNumber, validatedSeats)
        ),
      });

      if (userHolds.length !== validatedSeats.length) {
        throw new Error("One or more selected seats have expired or are no longer held. Please reselect.");
      }

      subtotalCents = userHolds.reduce((acc, h) => acc + h.priceCents, 0);
    }

    // Coupon Validation
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

    const feeBreakdown = this.calculateFeeBreakdown(subtotalCents, discountCents, appliedCoupon);

    // If total payable is 0, route through FreeEventProvider
    const effectiveGatewayId: PaymentGatewayId = feeBreakdown.totalAmountCents === 0 ? "free" : gatewayId;
    const provider = paymentRegistry.getProvider(effectiveGatewayId);

    const orderId = `ORD-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    const orderInput: CreatePaymentOrderInput = {
      orderId,
      amountCents: feeBreakdown.totalAmountCents,
      currency: "INR",
      description: `Gatherly Tickets - ${event.title}`,
      customer: {
        ...customer,
        userId,
      },
      items: [
        {
          title: event.title,
          quantity: params.quantity,
          unitPriceCents: event.ticketPriceCents,
          totalPriceCents: subtotalCents,
        },
      ],
      metadata: {
        eventId: event.id,
        userId,
        seats: validatedSeats,
        quantity: params.quantity,
        couponCode: appliedCoupon,
        discountCents,
        subtotalCents,
        taxesCents: feeBreakdown.taxesCents,
        convenienceFeeCents: feeBreakdown.convenienceFeeCents,
        isGuest: params.isGuest || false,
      },
      returnUrl,
      cancelUrl,
    };

    const orderResult = await provider.createOrder(orderInput);

    // Log initiation
    await db.insert(paymentLogs).values({
      userId,
      gateway: effectiveGatewayId,
      transactionId: orderResult.gatewayOrderId,
      amountCents: feeBreakdown.totalAmountCents,
      status: "initiated",
      paymentMethodDetails: JSON.stringify({
        orderId,
        gateway: effectiveGatewayId,
        breakdown: feeBreakdown,
      }),
    });

    return { orderResult, feeBreakdown, event };
  }

  /**
   * Verify and atomically confirm a completed payment.
   */
  public async verifyAndCompletePayment(params: {
    gatewayId: PaymentGatewayId;
    verifyInput: VerifyPaymentInput;
    metadata: {
      eventId: number;
      userId: number;
      quantity: number;
      seats?: string[];
      couponCode?: string | null;
      discountCents?: number;
      totalCents: number;
      isGuest?: boolean;
      guestEmail?: string | null;
      guestName?: string | null;
    };
  }) {
    const { gatewayId, verifyInput, metadata } = params;
    const provider = paymentRegistry.getProvider(gatewayId);

    // 1. Verify with Gateway
    const verification = await provider.verifyPayment(verifyInput);
    if (!verification.success) {
      throw new Error(verification.errorMessage || "Payment verification failed at gateway");
    }

    // 2. Atomic Database Commit with Idempotency
    return await db.transaction(async (tx) => {
      // Idempotency check: if transactionId or orderId already exists
      const existing = await tx.query.bookings.findFirst({
        where: eq(bookings.stripeSessionId, verifyInput.gatewayPaymentId || verifyInput.orderId),
      });
      if (existing) {
        return { booking: existing, isDuplicate: true };
      }

      const event = await tx.query.events.findFirst({
        where: eq(events.id, metadata.eventId),
      });
      const user = await tx.query.users.findFirst({
        where: eq(users.id, metadata.userId),
      });

      if (!event || !user) {
        throw new Error("Event or attendee not found");
      }

      const reference = `EVT-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      const seatList = metadata.seats || [];

      // Create Booking Record
      const [booking] = await tx
        .insert(bookings)
        .values({
          reference,
          eventId: metadata.eventId,
          userId: metadata.userId,
          stripeSessionId: verifyInput.gatewayPaymentId || verifyInput.orderId,
          quantity: metadata.quantity,
          totalCents: metadata.totalCents,
          status: "confirmed",
          seats: seatList.length ? JSON.stringify(seatList) : null,
          couponCode: metadata.couponCode || null,
          discountCents: metadata.discountCents || 0,
          isGuest: metadata.isGuest || false,
          guestEmail: metadata.guestEmail || null,
          guestName: metadata.guestName || null,
        })
        .returning();

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
              eq(seatReservations.eventId, metadata.eventId),
              eq(seatReservations.userId, metadata.userId),
              inArray(seatReservations.seatNumber, seatList)
            )
          );
      }

      // Decrement Available Tickets
      await tx
        .update(events)
        .set({ ticketsRemaining: Math.max(0, event.ticketsRemaining - metadata.quantity) })
        .where(eq(events.id, metadata.eventId));

      // Wallet Debit if paid via Wallet
      if (gatewayId === "wallet" && metadata.totalCents > 0) {
        await tx
          .update(users)
          .set({
            walletBalanceCents: sql`GREATEST(0, COALESCE(${users.walletBalanceCents}, 0) - ${metadata.totalCents})`,
          })
          .where(eq(users.id, metadata.userId));
      }

      // Increment Coupon usedCount if coupon applied
      if (metadata.couponCode) {
        await tx
          .update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1` })
          .where(eq(coupons.code, metadata.couponCode));
      }

      // Record Succeeded Payment Log
      await tx.insert(paymentLogs).values({
        bookingId: booking.id,
        userId: metadata.userId,
        gateway: gatewayId,
        transactionId: verification.transactionId,
        amountCents: metadata.totalCents,
        status: "succeeded",
        paymentMethodDetails: JSON.stringify({
          gateway: gatewayId,
          orderId: verifyInput.orderId,
          details: verification.paymentMethodDetails,
        }),
      });

      // Audit Log
      await tx.insert(auditLogs).values({
        actorId: metadata.userId,
        action: "PAYMENT_SUCCEEDED",
        targetType: "booking",
        targetId: booking.id.toString(),
        details: JSON.stringify({
          gateway: gatewayId,
          amountCents: metadata.totalCents,
          reference: booking.reference,
        }),
      });

      // Generate Vector QR & PDF Pass asynchronously to not block DB response
      const qrBuffer = await generateQRCodeBuffer(booking.reference);
      const pdfPrice = event.ticketPriceCents === 0 ? "Free" : `Rs. ${(event.ticketPriceCents / 100).toLocaleString("en-IN")}`;
      const formattedTotal = metadata.totalCents === 0 ? "Free" : `₹${(metadata.totalCents / 100).toLocaleString("en-IN")}`;

      generateTicketPDF({
        eventTitle: event.title,
        eventDescription: event.description,
        eventLocation: event.location,
        eventDate: new Date(event.startsAt).toLocaleString(),
        attendeeName: user.name,
        attendeeEmail: user.email,
        reference: booking.reference,
        quantity: booking.quantity,
        qrBuffer,
        price: pdfPrice,
      }).then((pdfBuffer) => {
        sendTicketEmail({
          to: user.email,
          subject: `Your ticket for ${event.title}`,
          html: `
            <h2>Booking Confirmed for ${user.name}!</h2>
            <p>Your booking reference: <strong>${booking.reference}</strong></p>
            <p>Total Paid: <strong>${formattedTotal}</strong> via ${gatewayId.toUpperCase()}</p>
            <p>Your e-ticket PDF and QR gate pass are attached.</p>
          `,
          pdfBuffer,
          reference: booking.reference,
        }).catch((err) => console.warn("Failed sending ticket email:", err));
      }).catch((err) => console.warn("Failed generating PDF:", err));

      // Multi-channel notifications
      const { notifyBookingConfirmed } = await import("@/lib/notification-service");
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

      return { booking, isDuplicate: false, verification };
    });
  }

  /**
   * Process full or partial refund through provider.
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

    // Determine gateway from payment logs
    const lastLog = await db.query.paymentLogs.findFirst({
      where: and(eq(paymentLogs.bookingId, booking.id), eq(paymentLogs.status, "succeeded")),
      orderBy: (logs, { desc }) => [desc(logs.createdAt)],
    });

    const gatewayId = (lastLog?.gateway || "wallet") as PaymentGatewayId;
    const provider = paymentRegistry.getProvider(gatewayId);

    const refundResult = await provider.refund({
      transactionId: lastLog?.transactionId || `TXN_${booking.reference}`,
      amountCents: refundAmount,
      reason,
      bookingId: booking.id,
    });

    if (refundResult.success) {
      // Record in refunds table
      await db.insert(refunds).values({
        bookingId: booking.id,
        userId: booking.userId,
        gateway: gatewayId,
        transactionId: lastLog?.transactionId || booking.reference,
        refundId: refundResult.refundId,
        amountCents: refundAmount,
        currency: "INR",
        reason,
        status: "succeeded",
      });

      // Update booking refund status
      const isFull = refundAmount >= booking.totalCents;
      await db
        .update(bookings)
        .set({
          refundStatus: isFull ? "refunded" : "partially_refunded",
          refundAmountCents: (booking.refundAmountCents || 0) + refundAmount,
          cancellationReason: reason,
        })
        .where(eq(bookings.id, booking.id));

      // If refunded to wallet, credit user balance
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
   * Handle incoming webhooks across Stripe, Razorpay, PhonePe, Cashfree, PayPal.
   */
  public async handleWebhook(gatewayId: PaymentGatewayId, input: WebhookVerificationInput) {
    const provider = paymentRegistry.getProvider(gatewayId);
    let eventResult: WebhookEventResult = { isValid: false, eventType: "unknown" };

    if (provider.verifyWebhook) {
      eventResult = await provider.verifyWebhook(input);
    } else {
      // Default fallback
      eventResult = { isValid: true, eventType: "payment.succeeded" };
    }

    // Record in webhookLogs
    await db.insert(webhookLogs).values({
      gateway: gatewayId,
      eventType: eventResult.eventType,
      payload: input.rawBody.slice(0, 5000),
      signature: typeof input.headers["x-signature"] === "string" ? input.headers["x-signature"] : null,
      status: eventResult.isValid ? "processed" : "failed",
      errorMessage: eventResult.error || null,
    });

    return eventResult;
  }
}

export const paymentService = new PaymentService();
