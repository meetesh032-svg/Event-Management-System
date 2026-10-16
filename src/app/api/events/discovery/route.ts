import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, users } from "@/db/schema";
import { eq, desc, sql, gte, and, ne } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const similarEventId = searchParams.get("similarTo");
    const similarCategory = searchParams.get("category");
    const city = searchParams.get("city");

    const now = new Date();

    // 1. Trending Events (Highest bookings / ticket velocity)
    const trendingRows = await db
      .select({
        event: events,
        organizerName: users.name,
        isVerifiedOrganizer: users.isVerifiedOrganizer,
        ticketsSold: sql<number>`${events.capacity} - ${events.ticketsRemaining}`,
      })
      .from(events)
      .leftJoin(users, eq(events.organizerId, users.id))
      .where(gte(events.startsAt, now))
      .orderBy(sql`${events.capacity} - ${events.ticketsRemaining} DESC`)
      .limit(6);

    // 2. Featured Events (Upcoming spotlight shows)
    const featuredRows = await db
      .select({
        event: events,
        organizerName: users.name,
      })
      .from(events)
      .leftJoin(users, eq(events.organizerId, users.id))
      .where(gte(events.startsAt, now))
      .orderBy(desc(events.createdAt))
      .limit(5);

    // 3. Popular Organizers (Hosts with published shows)
    const organizerRows = await db
      .select({
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        isVerifiedOrganizer: users.isVerifiedOrganizer,
        eventCount: sql<number>`count(${events.id})::int`,
      })
      .from(users)
      .innerJoin(events, eq(users.id, events.organizerId))
      .where(eq(users.role, "organizer"))
      .groupBy(users.id)
      .orderBy(sql`count(${events.id}) DESC`)
      .limit(8);

    // 4. Similar Events (if requested for an event detail page)
    let similarEvents: Array<typeof events.$inferSelect & { organizerName: string | null }> = [];
    if (similarCategory) {
      const conditions = [
        eq(events.category, similarCategory),
        gte(events.startsAt, now),
      ];
      if (similarEventId) {
        const idNum = parseInt(similarEventId, 10);
        if (!isNaN(idNum)) {
          conditions.push(ne(events.id, idNum));
        }
      }

      const simRows = await db
        .select({
          event: events,
          organizerName: users.name,
        })
        .from(events)
        .leftJoin(users, eq(events.organizerId, users.id))
        .where(and(...conditions))
        .limit(4);

      similarEvents = simRows.map((r) => ({
        ...r.event,
        organizerName: r.organizerName,
      }));
    }

    return NextResponse.json({
      trending: trendingRows.map((r) => ({
        ...r.event,
        organizerName: r.organizerName,
        isVerifiedOrganizer: r.isVerifiedOrganizer,
        ticketsSold: Number(r.ticketsSold) || 0,
      })),
      featured: featuredRows.map((r) => ({
        ...r.event,
        organizerName: r.organizerName,
      })),
      popularOrganizers: organizerRows,
      similar: similarEvents,
    });
  } catch (error) {
    console.error("Discovery API error:", error);
    return NextResponse.json({ error: "Failed to fetch discovery data" }, { status: 500 });
  }
}
