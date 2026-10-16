import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, bookings, users } from "@/db/schema";
import { and, eq, sql, desc } from "drizzle-orm";
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

    // Aggregate stats
    const [stats] = await db
      .select({
        totalBookings: sql<number>`COUNT(CASE WHEN ${bookings.status} = 'confirmed' THEN 1 END)`.mapWith(Number),
        ticketsSold: sql<number>`COALESCE(SUM(CASE WHEN ${bookings.status} = 'confirmed' THEN ${bookings.quantity} ELSE 0 END), 0)`.mapWith(Number),
        checkedInCount: sql<number>`COALESCE(SUM(CASE WHEN ${bookings.status} = 'confirmed' AND ${bookings.isCheckedIn} = true THEN ${bookings.quantity} ELSE 0 END), 0)`.mapWith(Number),
      })
      .from(bookings)
      .where(eq(bookings.eventId, eventId));

    const ticketsSold = stats?.ticketsSold || 0;
    const checkedInCount = stats?.checkedInCount || 0;
    const remainingCount = Math.max(0, ticketsSold - checkedInCount);
    const attendanceRate = ticketsSold > 0 ? Math.round((checkedInCount / ticketsSold) * 100) : 0;

    // Recent Entries
    const recentEntries = await db
      .select({
        id: bookings.id,
        reference: bookings.reference,
        quantity: bookings.quantity,
        seats: bookings.seats,
        checkedInAt: bookings.checkedInAt,
        attendeeName: users.name,
        attendeeEmail: users.email,
      })
      .from(bookings)
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(and(eq(bookings.eventId, eventId), eq(bookings.isCheckedIn, true)))
      .orderBy(desc(bookings.checkedInAt))
      .limit(10);

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        capacity: event.capacity,
        location: event.location,
        startsAt: event.startsAt,
      },
      stats: {
        capacity: event.capacity,
        ticketsSold,
        checkedInCount,
        remainingCount,
        attendanceRate,
      },
      recentEntries: recentEntries.map((r) => ({
        ...r,
        checkedInAt: r.checkedInAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error("Attendance API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
