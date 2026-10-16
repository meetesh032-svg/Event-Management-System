import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearAuthCookies, hashToken } from "@/lib/auth-service";
import { db } from "@/db";
import { refreshTokens, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const rawRefreshToken = cookieStore.get("refreshToken")?.value;
    const sessionId = cookieStore.get("sessionId")?.value;

    // Revoke refresh token in database
    if (rawRefreshToken) {
      const hashed = hashToken(rawRefreshToken);
      await db
        .update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens.tokenHash, hashed));
    }

    // Delete session from database
    if (sessionId) {
      await db
        .delete(sessions)
        .where(eq(sessions.sessionToken, sessionId));
    }

    await clearAuthCookies();
    return NextResponse.json({ ok: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    await clearAuthCookies();
    return NextResponse.json({ ok: true });
  }
}
