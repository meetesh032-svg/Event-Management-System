import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, bookings, users } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { requireOrganizer } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireOrganizer();
    const { id } = await params;
    const eventId = Number(id);

    if (Number.isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    // Verify organizer owns event or is admin
    const event = await db.query.events.findFirst({
      where: user.role === "admin" ? eq(events.id, eventId) : and(eq(events.id, eventId), eq(events.organizerId, user.id)),
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found or unauthorized" }, { status: 404 });
    }

    const body = await req.json();
    const { reference } = body;

    if (!reference || typeof reference !== "string") {
      return NextResponse.json({ error: "Missing ticket reference" }, { status: 400 });
    }

    const cleanRef = reference.trim().toUpperCase();

    // Query booking with attendee info
    const [row] = await db
      .select({
        booking: bookings,
        attendee: users,
      })
      .from(bookings)
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(and(eq(bookings.eventId, eventId), eq(bookings.reference, cleanRef)))
      .limit(1);

    if (!row) {
      return NextResponse.json({
        valid: false,
        duplicate: false,
        status: "NOT_FOUND",
        error: `No valid booking found for reference "${cleanRef}" at this event.`,
      }, { status: 404 });
    }

    const { booking, attendee } = row;

    // Check cancellation
    if (booking.status === "cancelled" || booking.refundStatus === "refunded") {
      return NextResponse.json({
        valid: false,
        duplicate: false,
        status: "CANCELLED",
        error: `Ticket has been CANCELLED or REFUNDED on ${booking.cancelledAt ? new Date(booking.cancelledAt).toLocaleDateString() : "system"}.`,
        attendee: { name: attendee.name, email: attendee.email },
        reference: booking.reference,
      }, { status: 400 });
    }

    // Duplicate Check
    if (booking.isCheckedIn) {
      const newCount = booking.checkInCount + 1;
      await db
        .update(bookings)
        .set({ checkInCount: newCount })
        .where(eq(bookings.id, booking.id));

      return NextResponse.json({
        valid: false,
        duplicate: true,
        status: "DUPLICATE",
        error: `DUPLICATE SCAN! This ticket was ALREADY checked in at ${new Date(booking.checkedInAt!).toLocaleTimeString()}.`,
        firstCheckedInAt: booking.checkedInAt,
        totalScanAttempts: newCount,
        reference: booking.reference,
        attendee: {
          name: attendee.name,
          email: attendee.email,
        },
        quantity: booking.quantity,
        seats: booking.seats,
      });
    }

    // Valid check-in transition
    const now = new Date();
    await db
      .update(bookings)
      .set({
        isCheckedIn: true,
        checkedInAt: now,
        checkInCount: 1,
      })
      .where(eq(bookings.id, booking.id));

    let parsedSeats: string[] = [];
    if (booking.seats) {
      try {
        parsedSeats = JSON.parse(booking.seats);
      } catch {
        parsedSeats = booking.seats.split(",").map((s) => s.trim());
      }
    }

    return NextResponse.json({
      valid: true,
      duplicate: false,
      status: "APPROVED",
      message: "Access Granted - Welcome!",
      reference: booking.reference,
      checkedInAt: now,
      attendee: {
        name: attendee.name,
        email: attendee.email,
        phone: attendee.phone,
      },
      quantity: booking.quantity,
      seats: parsedSeats,
      totalPaidCents: booking.totalCents,
    });
  } catch (error) {
    console.error("Check-in error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
