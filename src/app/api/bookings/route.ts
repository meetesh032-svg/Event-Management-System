import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, events } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const user = await requireAuth();

    const rows = await db
      .select({
        booking: bookings,
        event: events,
      })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .where(eq(bookings.userId, user.id))
      .orderBy(bookings.createdAt);

    return NextResponse.json({
      bookings: rows.map((r) => ({ ...r.booking, event: r.event })),
    });
  } catch (error) {
    console.error("List bookings error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
