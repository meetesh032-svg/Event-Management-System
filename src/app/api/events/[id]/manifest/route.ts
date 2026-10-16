import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, bookings, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireOrganizer } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireOrganizer();
    const { id } = await params;
    const eventId = Number(id);

    if (Number.isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const event = await db.query.events.findFirst({
      where: user.role === "admin" ? eq(events.id, eventId) : and(eq(events.id, eventId), eq(events.organizerId, user.id)),
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found or unauthorized" }, { status: 404 });
    }

    const rows = await db
      .select({
        reference: bookings.reference,
        attendeeName: users.name,
        quantity: bookings.quantity,
        seats: bookings.seats,
        isCheckedIn: bookings.isCheckedIn,
        checkedInAt: bookings.checkedInAt,
        status: bookings.status,
      })
      .from(bookings)
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(and(eq(bookings.eventId, eventId), eq(bookings.status, "confirmed")));

    return NextResponse.json({
      eventId: event.id,
      eventTitle: event.title,
      generatedAt: new Date().toISOString(),
      manifest: rows.map((r) => ({
        reference: r.reference,
        attendeeName: r.attendeeName,
        quantity: r.quantity,
        seats: r.seats,
        isCheckedIn: r.isCheckedIn,
        checkedInAt: r.checkedInAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error("Manifest download error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
