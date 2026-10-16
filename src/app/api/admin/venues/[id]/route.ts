import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { venues } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { recordAuditLog } from "@/lib/audit-service";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const venueId = Number(id);

    if (Number.isNaN(venueId)) {
      return NextResponse.json({ error: "Invalid venue id" }, { status: 400 });
    }

    const body = await req.json();
    const { isApproved } = body;

    const [updated] = await db
      .update(venues)
      .set({ isApproved: Boolean(isApproved) })
      .where(eq(venues.id, venueId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    // Record audit log
    await recordAuditLog({
      actorId: admin.id,
      action: updated.isApproved ? "VENUE_APPROVED" : "VENUE_REJECTED",
      targetType: "venue",
      targetId: venueId,
      details: { venueName: updated.name, isApproved: updated.isApproved },
    });

    return NextResponse.json({ venue: updated });
  } catch (error) {
    console.error("Admin update venue error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
