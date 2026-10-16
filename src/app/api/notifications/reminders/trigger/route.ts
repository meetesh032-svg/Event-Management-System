import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, bookings, users } from "@/db/schema";
import { and, gte, lte, eq } from "drizzle-orm";
import { notifyBookingReminder } from "@/lib/notification-service";

export async function POST(_req: NextRequest) {
  try {
    const now = new Date();

    // 24 Hour window: between +23h and +25h
    const window24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const window24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // 2 Hour window: between +1h and +3h
    const window2hStart = new Date(now.getTime() + 1 * 60 * 60 * 1000);
    const window2hEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    let sent24h = 0;
    let sent2h = 0;

    // Fetch 24h candidates
    const bookings24h = await db
      .select({
        booking: bookings,
        event: events,
        user: users,
      })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(
        and(
          eq(bookings.status, "confirmed"),
          gte(events.startsAt, window24hStart),
          lte(events.startsAt, window24hEnd)
        )
      );

    for (const b of bookings24h) {
      await notifyBookingReminder(b.booking, b.event, b.user, "24h");
      sent24h++;
    }

    // Fetch 2h candidates
    const bookings2h = await db
      .select({
        booking: bookings,
        event: events,
        user: users,
      })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(
        and(
          eq(bookings.status, "confirmed"),
          gte(events.startsAt, window2hStart),
          lte(events.startsAt, window2hEnd)
        )
      );

    for (const b of bookings2h) {
      await notifyBookingReminder(b.booking, b.event, b.user, "2h");
      sent2h++;
    }

    return NextResponse.json({
      success: true,
      remindersTriggered: {
        "24h": sent24h,
        "2h": sent2h,
        total: sent24h + sent2h,
      },
    });
  } catch (error) {
    console.error("Reminder trigger error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
