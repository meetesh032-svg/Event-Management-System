import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { recordAuditLog } from "@/lib/audit-service";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const eventId = Number(id);

    if (Number.isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const body = await req.json();
    const { isFeatured, status } = body;

    const updateData: Record<string, any> = {};
    if (isFeatured !== undefined) updateData.isFeatured = Boolean(isFeatured);
    if (status !== undefined) updateData.status = status;

    const [updated] = await db
      .update(events)
      .set(updateData)
      .where(eq(events.id, eventId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Record audit log
    await recordAuditLog({
      actorId: admin.id,
      action: isFeatured !== undefined ? (isFeatured ? "EVENT_FEATURED" : "EVENT_UNFEATURED") : `EVENT_STATUS_${status?.toUpperCase()}`,
      targetType: "event",
      targetId: eventId,
      details: { title: updated.title, status: updated.status, isFeatured: updated.isFeatured },
    });

    return NextResponse.json({ event: updated });
  } catch (error) {
    console.error("Admin moderate event error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
