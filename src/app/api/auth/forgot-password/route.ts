import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateSecureToken, hashToken } from "@/lib/auth-service";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    // Don't leak whether account exists to protect user privacy
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, a reset link has been dispatched.",
      });
    }

    const rawResetToken = generateSecureToken(32);
    const hashedResetToken = hashToken(rawResetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour TTL

    await db
      .update(users)
      .set({
        passwordResetToken: hashedResetToken,
        passwordResetExpires: expiresAt,
      })
      .where(eq(users.id, user.id));

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${rawResetToken}`;

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a reset link has been dispatched.",
      resetUrl, // Provided for instant testing/demo without requiring live SMTP credentials
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
