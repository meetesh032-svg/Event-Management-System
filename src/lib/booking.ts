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

    const quantity = 1;
    const reference = `EVT-${Date.now()}-${crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase()}`;

    const [booking] = await tx
      .insert(bookings)
      .values({
        reference,
        eventId,
        userId,
        stripeSessionId: session.id,
        quantity,
        totalCents: event.ticketPriceCents * quantity,
        status: "confirmed",
      })
      .returning();

    await tx
      .update(events)
      .set({ ticketsRemaining: event.ticketsRemaining - quantity })
      .where(eq(events.id, eventId));

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

    await sendTicketEmail({
      to: user.email,
      subject: `Your ticket for ${event.title}`,
      html: `
        <h2>Thanks for booking, ${user.name}!</h2>
        <p>Your booking reference is <strong>${reference}</strong>.</p>
        <p>Event: ${event.title}<br/>Location: ${event.location}<br/>Date: ${new Date(
        event.startsAt
      ).toLocaleString()}<br/>Amount: <strong>${formattedRupees}</strong></p>
        <p>Your e-ticket is attached. Have a great time!</p>
      `,
      pdfBuffer,
      reference,
    });

    return booking;
  });
}
