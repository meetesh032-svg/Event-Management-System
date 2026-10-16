import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, bookings, users } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const eventId = Number(id);
    if (Number.isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const [event] = await db
      .select({
        id: events.id,
        title: events.title,
        startsAt: events.startsAt,
        endsAt: events.endsAt,
        capacity: events.capacity,
        ticketsRemaining: events.ticketsRemaining,
        status: events.status,
      })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const now = new Date();
    const startsAt = new Date(event.startsAt);
    const endsAt = new Date(event.endsAt);

    const isLiveNow = now >= startsAt && now <= endsAt;
    const isPast = now > endsAt;
    const isUpcoming = now < startsAt;
    const timeRemainingMs = Math.max(0, startsAt.getTime() - now.getTime());

    // Checked-in count
    const [attendanceRow] = await db
      .select({
        checkedInCount: sql<number>`cast(count(*) as int)`,
      })
      .from(bookings)
      .where(and(eq(bookings.eventId, eventId), eq(bookings.isCheckedIn, true)));

    const checkedInCount = attendanceRow?.checkedInCount || 0;
    const bookedCount = event.capacity - event.ticketsRemaining;
    const checkInRate = bookedCount > 0 ? Math.round((checkedInCount / bookedCount) * 100) : 0;

    // Recent 3 bookings for social proof activity ticker
    const recentBookings = await db
      .select({
        id: bookings.id,
        createdAt: bookings.createdAt,
        quantity: bookings.quantity,
        userName: users.name,
      })
      .from(bookings)
      .leftJoin(users, eq(bookings.userId, users.id))
      .where(and(eq(bookings.eventId, eventId), eq(bookings.status, "confirmed")))
      .orderBy(desc(bookings.createdAt))
      .limit(3);

    // Live active viewers (realistic variance based on eventId + 3-minute interval)
    const timeBucket = Math.floor(Date.now() / (1000 * 180));
    const pseudoSeed = (eventId * 9301 + 49297 + timeBucket * 233) % 17;
    const liveViewingCount = Math.max(3, 8 + (pseudoSeed % 22));

    return NextResponse.json({
      eventId: event.id,
      title: event.title,
      isLiveNow,
      isPast,
      isUpcoming,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      timeRemainingMs,
      ticketsRemaining: event.ticketsRemaining,
      capacity: event.capacity,
      bookedCount,
      checkedInCount,
      checkInRate,
      liveViewingCount,
      recentBookings: recentBookings.map((b) => ({
        id: b.id,
        buyerInitial: b.userName ? b.userName[0].toUpperCase() : "A",
        buyerName: b.userName ? `${b.userName.split(" ")[0]} ***` : "Guest Attendee",
        quantity: b.quantity,
        timeAgoMinutes: Math.max(1, Math.floor((Date.now() - new Date(b.createdAt).getTime()) / 60000)),
      })),
    });
  } catch (error) {
    console.error("Live event status error:", error);
    return NextResponse.json({ error: "Failed to fetch live event state" }, { status: 500 });
  }
}
