import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eventComments, users, events } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { sendNotification } from "@/lib/notification-service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const eventId = Number(id);

    if (Number.isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const rows = await db
      .select({
        id: eventComments.id,
        content: eventComments.content,
        parentId: eventComments.parentId,
        createdAt: eventComments.createdAt,
        userId: eventComments.userId,
        userName: users.name,
        userAvatar: users.avatarUrl,
        userRole: users.role,
      })
      .from(eventComments)
      .innerJoin(users, eq(eventComments.userId, users.id))
      .where(eq(eventComments.eventId, eventId))
      .orderBy(desc(eventComments.createdAt));

    return NextResponse.json({
      comments: rows.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Get comments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const eventId = Number(id);

    if (Number.isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const body = await req.json();
    const { content, parentId } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Comment content cannot be empty" }, { status: 400 });
    }

    const [newComment] = await db
      .insert(eventComments)
      .values({
        eventId,
        userId: user.id,
        content: content.trim(),
        parentId: parentId ? Number(parentId) : null,
      })
      .returning();

    // Notify event organizer if comment is by another user
    if (event.organizerId !== user.id) {
      await sendNotification({
        userId: event.organizerId,
        channel: "in_app",
        type: "system",
        title: `New Question on ${event.title}`,
        message: `${user.name} asked: "${content.trim().slice(0, 100)}"`,
        metadata: { eventId, commentId: newComment.id },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      comment: {
        ...newComment,
        userName: user.name,
        userAvatar: user.avatarUrl,
        userRole: user.role,
        createdAt: newComment.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Post comment error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
