import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createBookingFromSession } from "@/lib/booking";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { eq, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");
    const bookingRef = searchParams.get("booking_ref");

    if (!sessionId && !bookingRef) {
      return NextResponse.json({ error: "Missing session or booking identifier" }, { status: 400 });
    }

    // 1. Check if booking already confirmed and committed in database
    const identifier = bookingRef || sessionId;
    if (identifier) {
      const existing = await db.query.bookings.findFirst({
        where: or(eq(bookings.reference, identifier), eq(bookings.stripeSessionId, identifier)),
      });
      if (existing) {
        return NextResponse.json({ booking: existing });
      }
    }

    // 2. If Stripe session ID provided, verify directly with official Stripe API
    if (sessionId && sessionId.startsWith("cs_")) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== "paid") {
        return NextResponse.json(
          { error: `Payment not completed. Stripe payment status is "${session.payment_status}".` },
          { status: 402 }
        );
      }

      // Atomically create booking, QR code, and send invoice
      const booking = await createBookingFromSession(session);
      return NextResponse.json({ booking });
    }

    return NextResponse.json(
      { error: "Unverified transaction. Real payment gateway confirmation is required before tickets can be issued." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Confirm checkout error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
