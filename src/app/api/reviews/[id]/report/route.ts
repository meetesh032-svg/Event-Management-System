import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { recordAuditLog } from "@/lib/audit-service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const reviewId = Number(id);

    if (Number.isNaN(reviewId)) {
      return NextResponse.json({ error: "Invalid review id" }, { status: 400 });
    }

    const body = await req.json();
    const { reason = "Inappropriate content" } = body;

    const [updated] = await db
      .update(reviews)
      .set({
        isReported: true,
        reportReason: reason,
      })
      .where(eq(reviews.id, reviewId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Record audit log for admin review
    await recordAuditLog({
      actorId: user.id,
      action: "REVIEW_REPORTED",
      targetType: "review" as any,
      targetId: reviewId,
      details: { reason, reporterId: user.id },
    });

    return NextResponse.json({ success: true, message: "Review has been reported for moderation." });
  } catch (error) {
    console.error("Report review error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
