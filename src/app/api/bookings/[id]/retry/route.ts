import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, events } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const bookingId = Number(id);

    if (isNaN(bookingId)) {
      return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
    }

    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const event = await db.query.events.findFirst({
      where: eq(events.id, booking.eventId),
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.ticketsRemaining < booking.quantity) {
      return NextResponse.json(
        { error: "Sorry, this event does not have enough tickets remaining to retry" },
        { status: 409 }
      );
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? `http://${req.headers.get("host")}`;
    const seatsParam = booking.seats ? `&seats=${encodeURIComponent(booking.seats)}` : "";
    const couponParam = booking.couponCode ? `&coupon=${encodeURIComponent(booking.couponCode)}&discount=${booking.discountCents}` : "";

    // Redirect to real official checkout
    const retryCheckoutUrl = `${origin}/checkout?eventId=${event.id}&userId=${user.id}&amount=${booking.totalCents}&quantity=${booking.quantity}&title=${encodeURIComponent(event.title)}${seatsParam}${couponParam}`;

    return NextResponse.json({
      success: true,
      retryUrl: retryCheckoutUrl,
    });
  } catch (error) {
    console.error("Retry payment error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
