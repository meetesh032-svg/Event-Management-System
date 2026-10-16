import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { recordAuditLog } from "@/lib/audit-service";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const userId = Number(id);

    if (Number.isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const body = await req.json();
    const { role, isVerifiedOrganizer } = body;

    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: Record<string, any> = {};
    if (role !== undefined) updateData.role = role;
    if (isVerifiedOrganizer !== undefined) updateData.isVerifiedOrganizer = Boolean(isVerifiedOrganizer);

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    // Audit log
    await recordAuditLog({
      actorId: admin.id,
      action: "USER_MODIFIED",
      targetType: "user",
      targetId: userId,
      details: {
        previousRole: targetUser.role,
        newRole: updated.role,
        previousVerified: targetUser.isVerifiedOrganizer,
        newVerified: updated.isVerifiedOrganizer,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Admin update user error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
