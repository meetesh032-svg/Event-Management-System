import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events, bookings, users } from "@/db/schema";
import { generateQRCodeBuffer } from "./qr";
import { generateTicketPDF } from "./pdf";
import { sendTicketEmail } from "./email";
import crypto from "crypto";
import Stripe from "stripe";

export async function createBookingFromSession(session: Stripe.Checkout.Session) {
  const eventId = Number(session.metadata?.eventId);
  const userId = Number(session.metadata?.userId);

  if (!eventId || !userId) {
    throw new Error("Missing event or user metadata in Stripe session");
  }

  return db.transaction(async (tx) => {
    // Idempotency: do not recreate if session already processed
    const existing = await tx.query.bookings.findFirst({
      where: eq(bookings.stripeSessionId, session.id),
    });
    if (existing) return existing;

    const event = await tx.query.events.findFirst({
      where: eq(events.id, eventId),
    });
    const user = await tx.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!event || !user) {
      throw new Error("Event or user not found");
    }

    if (event.ticketsRemaining < 1) {
      throw new Error("Event is sold out");
    }

    const quantity = session.metadata?.quantity ? Math.max(1, Number(session.metadata.quantity)) : 1;
    const rawSeats = session.metadata?.seats;
    let seatList: string[] = [];
    if (rawSeats) {
      try {
        seatList = JSON.parse(rawSeats);
      } catch {
        seatList = rawSeats.split(",").map((s: string) => s.trim());
      }
    }

    const reference = `EVT-${Date.now()}-${crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase()}`;

    const discountCents = session.metadata?.discount ? Number(session.metadata.discount) : 0;
    const couponCode = session.metadata?.coupon || null;
    const isGuest = session.metadata?.isGuest === "true";
    const guestEmail = session.metadata?.guestEmail || null;
    const guestName = session.metadata?.guestName || null;
    const finalTotalCents = session.metadata?.totalCents
      ? Number(session.metadata.totalCents)
      : Math.max(0, event.ticketPriceCents * quantity - discountCents);

    const [booking] = await tx
      .insert(bookings)
      .values({
        reference,
        eventId,
        userId,
        stripeSessionId: session.id,
        quantity,
        totalCents: finalTotalCents,
        status: "confirmed",
        seats: seatList.length ? JSON.stringify(seatList) : null,
        couponCode,
        discountCents,
        isGuest,
        guestEmail,
        guestName,
      })
      .returning();

    // Increment coupon usage if used
    if (couponCode) {
      const { coupons } = await import("@/db/schema");
      const { sql } = await import("drizzle-orm");
      await tx
        .update(coupons)
        .set({ usedCount: sql`${coupons.usedCount} + 1` })
        .where(eq(coupons.code, couponCode));
    }

    // If specific seats were reserved, transition them from 'held' to 'booked'
    if (seatList.length > 0) {
      const { seatReservations } = await import("@/db/schema");
      const { inArray, and } = await import("drizzle-orm");
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
            eq(seatReservations.eventId, eventId),
            eq(seatReservations.userId, userId),
            inArray(seatReservations.seatNumber, seatList)
          )
        );
    }

    await tx
      .update(events)
      .set({ ticketsRemaining: Math.max(0, event.ticketsRemaining - quantity) })
      .where(eq(events.id, eventId));

    // Payment Log & Wallet Balance Adjustment
    const selectedGateway = (session.metadata?.gateway || "stripe") as "stripe" | "razorpay" | "paypal" | "upi" | "wallet";
    if (selectedGateway === "wallet" && finalTotalCents > 0) {
      const { sql } = await import("drizzle-orm");
      await tx
        .update(users)
        .set({
          walletBalanceCents: sql`GREATEST(0, COALESCE(${users.walletBalanceCents}, 0) - ${finalTotalCents})`,
        })
        .where(eq(users.id, userId));
    }

    const { paymentLogs } = await import("@/db/schema");
    await tx.insert(paymentLogs).values({
      bookingId: booking.id,
      userId,
      gateway: selectedGateway,
      transactionId: `TXN-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
      amountCents: finalTotalCents,
      status: "succeeded",
      paymentMethodDetails: JSON.stringify({
        gateway: selectedGateway,
        isGuest,
        guestEmail,
        couponCode,
      }),
    });

    // Generate QR + PDF + email outside the tx so DB commit is not blocked,
    // but keep this in the helper for a single call site.
    const qrBuffer = await generateQRCodeBuffer(reference);
    const pdfPrice = event.ticketPriceCents === 0 ? "Free" : `Rs. ${(event.ticketPriceCents / 100).toLocaleString("en-IN")}`;
    const formattedRupees = event.ticketPriceCents === 0 ? "Free" : `₹${((event.ticketPriceCents * quantity) / 100).toLocaleString("en-IN")}`;

    const pdfBuffer = await generateTicketPDF({
      eventTitle: event.title,
      eventDescription: event.description,
      eventLocation: event.location,
      eventDate: new Date(event.startsAt).toLocaleString(),
      attendeeName: user.name,
      attendeeEmail: user.email,
      reference,
      quantity,
      qrBuffer,
      price: pdfPrice,
    });

    const seatsInfoHtml = seatList.length > 0 ? `<p>Seats: <strong>${seatList.join(", ")}</strong></p>` : "";

    await sendTicketEmail({
      to: user.email,
      subject: `Your ticket for ${event.title}`,
      html: `
        <h2>Thanks for booking, ${user.name}!</h2>
        <p>Your booking reference is <strong>${reference}</strong>.</p>
        <p>Event: ${event.title}<br/>Location: ${event.location}<br/>Date: ${new Date(
        event.startsAt
      ).toLocaleString()}<br/>Amount: <strong>${formattedRupees}</strong></p>
        ${seatsInfoHtml}
        <p>Your e-ticket is attached. Have a great time!</p>
      `,
      pdfBuffer,
      reference,
    });

    // Multi-channel notifications (In-app, SMS, WhatsApp, Push)
    const { notifyBookingConfirmed } = await import("./notification-service");
    await notifyBookingConfirmed(
      {
        id: booking.id,
        reference: booking.reference,
        totalCents: booking.totalCents,
        quantity: booking.quantity,
        seats: booking.seats,
      },
      event,
      user
    ).catch((err) => console.warn("Failed to dispatch booking confirmation notifications:", err));

    return booking;
  });
}
