import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, bookings, favorites } from "@/db/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    let preferredCategories: string[] = [];

    if (user?.id) {
      // Find categories from user's past bookings
      const bookedEvents = await db
        .select({ category: events.category })
        .from(bookings)
        .innerJoin(events, eq(bookings.eventId, events.id))
        .where(eq(bookings.userId, user.id))
        .limit(10);

      // Find categories from favorites
      const favEvents = await db
        .select({ category: events.category })
        .from(favorites)
        .innerJoin(events, eq(favorites.eventId, events.id))
        .where(eq(favorites.userId, user.id))
        .limit(10);

      const combinedCategories = [...bookedEvents, ...favEvents].map((e) => e.category);
      if (combinedCategories.length > 0) {
        preferredCategories = Array.from(new Set(combinedCategories));
      }
    }

    let recommendedList: any[] = [];

    if (preferredCategories.length > 0) {
      recommendedList = await db
        .select({
          id: events.id,
          title: events.title,
          category: events.category,
          location: events.location,
          ticketPriceCents: events.ticketPriceCents,
          startsAt: events.startsAt,
          imageUrl: events.imageUrl,
          capacity: events.capacity,
          ticketsRemaining: events.ticketsRemaining,
        })
        .from(events)
        .where(inArray(events.category, preferredCategories))
        .orderBy(desc(events.createdAt))
        .limit(6);
    }

    // Fallback if no personalized matches or not logged in: top available events
    if (recommendedList.length < 4) {
      const fallbackEvents = await db
        .select({
          id: events.id,
          title: events.title,
          category: events.category,
          location: events.location,
          ticketPriceCents: events.ticketPriceCents,
          startsAt: events.startsAt,
          imageUrl: events.imageUrl,
          capacity: events.capacity,
          ticketsRemaining: events.ticketsRemaining,
        })
        .from(events)
        .where(sql`${events.ticketsRemaining} > 0`)
        .orderBy(desc(events.createdAt))
        .limit(6);

      // Merge unique
      const existingIds = new Set(recommendedList.map((r) => r.id));
      for (const fe of fallbackEvents) {
        if (!existingIds.has(fe.id)) {
          recommendedList.push(fe);
        }
      }
    }

    const results = recommendedList.map((e) => ({
      ...e,
      recommendationReason: preferredCategories.includes(e.category)
        ? `Because you enjoy ${e.category} experiences`
        : "Trending AI Pick for You",
    }));

    return NextResponse.json({
      recommendations: results,
      hasPersonalizedHistory: preferredCategories.length > 0,
      preferredCategories,
    });
  } catch (error) {
    console.error("AI Recommendations error:", error);
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 });
  }
}
