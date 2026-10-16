import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createBookingFromSession } from "@/lib/booking";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session id" }, { status: 400 });
    }

    let session: any;

    if (sessionId.startsWith("fake_sess_")) {
      session = {
        id: sessionId,
        payment_status: "paid",
        metadata: {
          eventId: searchParams.get("fake_event_id"),
          userId: searchParams.get("fake_user_id"),
          seats: searchParams.get("fake_seats"),
          quantity: searchParams.get("fake_quantity"),
          coupon: searchParams.get("fake_coupon"),
          discount: searchParams.get("fake_discount"),
          isGuest: searchParams.get("is_guest"),
          guestEmail: searchParams.get("guest_email"),
          guestName: searchParams.get("guest_name"),
          totalCents: searchParams.get("fake_total"),
          gateway: searchParams.get("fake_gateway") || "card",
        },
      };
    } else {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
    }

    const booking = await createBookingFromSession(session);

    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Confirm checkout error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
