import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reviews, users, events } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { and, eq, desc, sql } from "drizzle-orm";
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
        id: reviews.id,
        rating: reviews.rating,
        title: reviews.title,
        comment: reviews.comment,
        photoUrls: reviews.photoUrls,
        organizerReply: reviews.organizerReply,
        organizerRepliedAt: reviews.organizerRepliedAt,
        createdAt: reviews.createdAt,
        userId: reviews.userId,
        userName: users.name,
        userAvatar: users.avatarUrl,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(and(eq(reviews.eventId, eventId), eq(reviews.isReported, false)))
      .orderBy(desc(reviews.createdAt));

    const totalReviews = rows.length;
    let sumRating = 0;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const r of rows) {
      sumRating += r.rating;
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    }

    const averageRating = totalReviews > 0 ? Number((sumRating / totalReviews).toFixed(1)) : 0;

    const formattedReviews = rows.map((r) => {
      let parsedPhotos: string[] = [];
      if (r.photoUrls) {
        try {
          parsedPhotos = JSON.parse(r.photoUrls);
        } catch {
          parsedPhotos = [];
        }
      }
      return {
        ...r,
        photoUrls: parsedPhotos,
        createdAt: r.createdAt.toISOString(),
        organizerRepliedAt: r.organizerRepliedAt ? r.organizerRepliedAt.toISOString() : null,
      };
    });

    return NextResponse.json({
      averageRating,
      totalReviews,
      distribution,
      reviews: formattedReviews,
    });
  } catch (error) {
    console.error("Get reviews error:", error);
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
    const { rating, title, comment, photoUrls } = body;

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5 stars" }, { status: 400 });
    }

    if (!comment || typeof comment !== "string" || !comment.trim()) {
      return NextResponse.json({ error: "Review comment cannot be empty" }, { status: 400 });
    }

    const [newReview] = await db
      .insert(reviews)
      .values({
        eventId,
        userId: user.id,
        rating: numRating,
        title: title?.trim() || null,
        comment: comment.trim(),
        photoUrls: Array.isArray(photoUrls) && photoUrls.length > 0 ? JSON.stringify(photoUrls) : null,
      })
      .returning();

    // Notify event organizer about the new review
    await sendNotification({
      userId: event.organizerId,
      channel: ["in_app", "email"],
      type: "system",
      title: `New ${numRating}★ Review for ${event.title}`,
      message: `${user.name} rated your event ${numRating} stars: "${comment.slice(0, 100)}..."`,
      metadata: { reviewId: newReview.id, eventId },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      review: {
        ...newReview,
        userName: user.name,
        userAvatar: user.avatarUrl,
        photoUrls: photoUrls || [],
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Post review error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
