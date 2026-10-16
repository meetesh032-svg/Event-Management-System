import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth();

    const items = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    const [unread] = await db
      .select({
        count: sql<number>`COUNT(CASE WHEN ${notifications.isRead} = false THEN 1 END)`.mapWith(Number),
      })
      .from(notifications)
      .where(eq(notifications.userId, user.id));

    return NextResponse.json({
      notifications: items,
      unreadCount: unread?.count || 0,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
