import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { favorites } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ isFavorite: false });
    }

    const eventIdParam = req.nextUrl.searchParams.get("eventId");
    const eventId = parseInt(eventIdParam || "", 10);

    if (isNaN(eventId)) {
      return NextResponse.json({ isFavorite: false });
    }

    const existing = await db.query.favorites.findFirst({
      where: and(
        eq(favorites.userId, user.id),
        eq(favorites.eventId, eventId)
      ),
    });

    return NextResponse.json({ isFavorite: !!existing });
  } catch {
    return NextResponse.json({ isFavorite: false });
  }
}
