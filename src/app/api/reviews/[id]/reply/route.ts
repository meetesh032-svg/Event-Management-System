import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reviews, events } from "@/db/schema";
import { requireOrganizer } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { sendNotification } from "@/lib/notification-service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireOrganizer();
    const { id } = await params;
    const reviewId = Number(id);

    if (Number.isNaN(reviewId)) {
      return NextResponse.json({ error: "Invalid review id" }, { status: 400 });
    }

    const review = await db.query.reviews.findFirst({
      where: eq(reviews.id, reviewId),
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const event = await db.query.events.findFirst({
      where: eq(events.id, review.eventId),
    });

    if (!event || (event.organizerId !== user.id && user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized to reply to this review" }, { status: 403 });
    }

    const body = await req.json();
    const { reply } = body;

    if (!reply || typeof reply !== "string" || !reply.trim()) {
      return NextResponse.json({ error: "Reply text is required" }, { status: 400 });
    }

    const now = new Date();
    const [updated] = await db
      .update(reviews)
      .set({
        organizerReply: reply.trim(),
        organizerRepliedAt: now,
      })
      .where(eq(reviews.id, reviewId))
      .returning();

    // Notify review author
    await sendNotification({
      userId: review.userId,
      channel: ["in_app", "email"],
      type: "system",
      title: `Organizer replied to your review for ${event.title}`,
      message: `${user.name} wrote: "${reply.trim().slice(0, 120)}..."`,
      metadata: { reviewId, eventId: event.id },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      organizerReply: updated.organizerReply,
      organizerRepliedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Organizer reply error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
