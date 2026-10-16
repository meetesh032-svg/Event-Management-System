import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { follows, users } from "@/db/schema";
import { getCurrentUser, requireAuth } from "@/lib/auth";
import { and, eq, sql } from "drizzle-orm";
import { sendNotification } from "@/lib/notification-service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const organizerId = Number(id);

    if (Number.isNaN(organizerId)) {
      return NextResponse.json({ error: "Invalid organizer id" }, { status: 400 });
    }

    const [stats] = await db
      .select({
        followerCount: sql<number>`COUNT(${follows.id})`.mapWith(Number),
      })
      .from(follows)
      .where(eq(follows.organizerId, organizerId));

    const currentUser = await getCurrentUser();
    let isFollowing = false;

    if (currentUser) {
      const existing = await db.query.follows.findFirst({
        where: and(eq(follows.organizerId, organizerId), eq(follows.followerId, currentUser.id)),
      });
      isFollowing = Boolean(existing);
    }

    return NextResponse.json({
      organizerId,
      followerCount: stats?.followerCount || 0,
      isFollowing,
    });
  } catch (error) {
    console.error("Get follow status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const organizerId = Number(id);

    if (Number.isNaN(organizerId)) {
      return NextResponse.json({ error: "Invalid organizer id" }, { status: 400 });
    }

    if (user.id === organizerId) {
      return NextResponse.json({ error: "You cannot follow yourself" }, { status: 400 });
    }

    const existing = await db.query.follows.findFirst({
      where: and(eq(follows.organizerId, organizerId), eq(follows.followerId, user.id)),
    });

    if (existing) {
      // Unfollow
      await db
        .delete(follows)
        .where(and(eq(follows.organizerId, organizerId), eq(follows.followerId, user.id)));

      const [stats] = await db
        .select({ count: sql<number>`COUNT(${follows.id})`.mapWith(Number) })
        .from(follows)
        .where(eq(follows.organizerId, organizerId));

      return NextResponse.json({
        isFollowing: false,
        followerCount: stats?.count || 0,
      });
    }

    // Follow
    await db.insert(follows).values({
      followerId: user.id,
      organizerId,
    });

    const [stats] = await db
      .select({ count: sql<number>`COUNT(${follows.id})`.mapWith(Number) })
      .from(follows)
      .where(eq(follows.organizerId, organizerId));

    // Send in-app notification to organizer
    await sendNotification({
      userId: organizerId,
      channel: "in_app",
      type: "system",
      title: "New Follower!",
      message: `${user.name} started following your organizer profile.`,
      metadata: { followerId: user.id },
    }).catch(() => {});

    return NextResponse.json({
      isFollowing: true,
      followerCount: stats?.count || 0,
    });
  } catch (error) {
    console.error("Follow organizer error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
