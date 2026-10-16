import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eventLikes } from "@/db/schema";
import { getCurrentUser, requireAuth } from "@/lib/auth";
import { and, eq, sql } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const eventId = Number(id);

    if (Number.isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const [stats] = await db
      .select({
        likesCount: sql<number>`COUNT(${eventLikes.id})`.mapWith(Number),
      })
      .from(eventLikes)
      .where(eq(eventLikes.eventId, eventId));

    const currentUser = await getCurrentUser();
    let isLiked = false;

    if (currentUser) {
      const existing = await db.query.eventLikes.findFirst({
        where: and(eq(eventLikes.eventId, eventId), eq(eventLikes.userId, currentUser.id)),
      });
      isLiked = Boolean(existing);
    }

    return NextResponse.json({
      eventId,
      likesCount: stats?.likesCount || 0,
      isLiked,
    });
  } catch (error) {
    console.error("Get event likes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const eventId = Number(id);

    if (Number.isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const existing = await db.query.eventLikes.findFirst({
      where: and(eq(eventLikes.eventId, eventId), eq(eventLikes.userId, user.id)),
    });

    if (existing) {
      // Unlike
      await db
        .delete(eventLikes)
        .where(and(eq(eventLikes.eventId, eventId), eq(eventLikes.userId, user.id)));

      const [stats] = await db
        .select({ count: sql<number>`COUNT(${eventLikes.id})`.mapWith(Number) })
        .from(eventLikes)
        .where(eq(eventLikes.eventId, eventId));

      return NextResponse.json({
        isLiked: false,
        likesCount: stats?.count || 0,
      });
    }

    // Like
    await db.insert(eventLikes).values({
      userId: user.id,
      eventId,
    });

    const [stats] = await db
      .select({ count: sql<number>`COUNT(${eventLikes.id})`.mapWith(Number) })
      .from(eventLikes)
      .where(eq(eventLikes.eventId, eventId));

    return NextResponse.json({
      isLiked: true,
      likesCount: stats?.count || 0,
    });
  } catch (error) {
    console.error("Toggle event like error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
