import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, events, users, seatReservations } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { and, eq } from "drizzle-orm";

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

    const body = await req.json().catch(() => ({}));
    const { reason, refundToWallet = true } = body;

    return await db.transaction(async (tx) => {
      // 1. Fetch booking
      const booking = await tx.query.bookings.findFirst({
        where: eq(bookings.id, bookingId),
      });

      if (!booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      if (booking.userId !== user.id && user.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (booking.status === "cancelled") {
        return NextResponse.json(
          { error: "This booking is already cancelled" },
          { status: 400 }
        );
      }

      // 2. Fetch event to verify dates
      const event = await tx.query.events.findFirst({
        where: eq(events.id, booking.eventId),
      });

      if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      const now = new Date();
      if (new Date(event.startsAt) < now) {
        return NextResponse.json(
          { error: "Cannot cancel a booking for an event that has already started" },
          { status: 400 }
        );
      }

      // 3. Restore event inventory
      await tx
        .update(events)
        .set({
          ticketsRemaining: event.ticketsRemaining + booking.quantity,
        })
        .where(eq(events.id, event.id));

      // 4. Release any reserved seats
      await tx
        .update(seatReservations)
        .set({
          status: "released",
          heldUntil: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(seatReservations.bookingId, booking.id),
            eq(seatReservations.eventId, event.id)
          )
        );

      // 5. Refund handling: Credit wallet balance if requested
      const refundStatus = refundToWallet ? "refunded" : "requested";
      if (refundToWallet && booking.totalCents > 0) {
        const currentUser = await tx.query.users.findFirst({
          where: eq(users.id, booking.userId),
        });
        const currentBalance = currentUser?.walletBalanceCents ?? 0;

        await tx
          .update(users)
          .set({
            walletBalanceCents: currentBalance + booking.totalCents,
          })
          .where(eq(users.id, booking.userId));
      }

      // 6. Update booking status
      const [updatedBooking] = await tx
        .update(bookings)
        .set({
          status: "cancelled",
          cancelledAt: now,
          cancellationReason: reason || "User requested cancellation",
          refundStatus,
          refundAmountCents: booking.totalCents,
        })
        .where(eq(bookings.id, bookingId))
        .returning();

      return NextResponse.json({
        success: true,
        message: refundToWallet
          ? `Booking cancelled and ₹${(booking.totalCents / 100).toLocaleString("en-IN")} credited to your wallet balance`
          : "Booking cancelled and refund request submitted",
        booking: updatedBooking,
      });
    });
  } catch (error) {
    console.error("Booking cancellation error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
