import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { favorites, events } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userFavorites = await db
      .select({
        favoriteId: favorites.id,
        favoritedAt: favorites.createdAt,
        event: events,
      })
      .from(favorites)
      .innerJoin(events, eq(favorites.eventId, events.id))
      .where(eq(favorites.userId, user.id))
      .orderBy(desc(favorites.createdAt));

    return NextResponse.json({ favorites: userFavorites });
  } catch (error) {
    console.error("Get favorites error:", error);
    return NextResponse.json({ error: "Failed to fetch wishlist" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in to save events" }, { status: 401 });
    }

    const { eventId } = await req.json();
    const parsedEventId = parseInt(eventId, 10);

    if (isNaN(parsedEventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    // Check if already in favorites
    const existing = await db.query.favorites.findFirst({
      where: and(
        eq(favorites.userId, user.id),
        eq(favorites.eventId, parsedEventId)
      ),
    });

    if (existing) {
      // Remove from favorites (toggle off)
      await db
        .delete(favorites)
        .where(eq(favorites.id, existing.id));

      return NextResponse.json({
        isFavorite: false,
        message: "Removed from your wishlist",
      });
    }

    // Add to favorites (toggle on)
    await db.insert(favorites).values({
      userId: user.id,
      eventId: parsedEventId,
    });

    return NextResponse.json({
      isFavorite: true,
      message: "Added to your wishlist",
    });
  } catch (error) {
    console.error("Toggle favorite error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
