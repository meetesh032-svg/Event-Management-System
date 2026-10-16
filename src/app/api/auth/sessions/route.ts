import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq, and, ne, desc } from "drizzle-orm";

export async function GET() {
  try {
    const user = await requireAuth();
    const cookieStore = await cookies();
    const currentSessionToken = cookieStore.get("sessionId")?.value;

    const userSessions = await db.query.sessions.findMany({
      where: eq(sessions.userId, user.id),
      orderBy: [desc(sessions.lastActive)],
    });

    const formattedSessions = userSessions.map((s) => ({
      id: s.id,
      deviceInfo: s.deviceInfo || "Unknown Device",
      ipAddress: s.ipAddress || "Unknown IP",
      lastActive: s.lastActive,
      createdAt: s.createdAt,
      isCurrentSession: s.sessionToken === currentSessionToken,
    }));

    return NextResponse.json({ sessions: formattedSessions });
  } catch (error) {
    console.error("Get sessions error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const { sessionToken, revokeAllOthers } = body;
    const cookieStore = await cookies();
    const currentSessionToken = cookieStore.get("sessionId")?.value;

    if (revokeAllOthers) {
      if (!currentSessionToken) {
        return NextResponse.json({ error: "Current session not identified" }, { status: 400 });
      }

      await db
        .delete(sessions)
        .where(
          and(
            eq(sessions.userId, user.id),
            ne(sessions.sessionToken, currentSessionToken)
          )
        );

      return NextResponse.json({
        success: true,
        message: "All other sessions have been signed out.",
      });
    }

    if (!sessionToken) {
      return NextResponse.json(
        { error: "sessionToken is required to terminate specific session" },
        { status: 400 }
      );
    }

    await db
      .delete(sessions)
      .where(
        and(
          eq(sessions.userId, user.id),
          eq(sessions.sessionToken, sessionToken)
        )
      );

    return NextResponse.json({
      success: true,
      message: "Session revoked successfully.",
    });
  } catch (error) {
    console.error("Revoke session error:", error);
    return NextResponse.json({ error: "Unauthorized or action failed" }, { status: 401 });
  }
}
