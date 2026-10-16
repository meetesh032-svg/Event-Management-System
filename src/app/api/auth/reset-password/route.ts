import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, refreshTokens, sessions } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { hashToken, createAuthSession } from "@/lib/auth-service";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and new password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    const hashedToken = hashToken(token.trim());

    const user = await db.query.users.findFirst({
      where: and(
        eq(users.passwordResetToken, hashedToken),
        gt(users.passwordResetExpires, new Date())
      ),
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid, expired, or already used password reset link." },
        { status: 400 }
      );
    }

    // Hash new password with 12 salt rounds
    const newPasswordHash = await bcrypt.hash(password, 12);

    // Update user password and clear reset tokens
    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      })
      .where(eq(users.id, user.id));

    // Security best practice: revoke all prior refresh tokens and active sessions
    await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.userId, user.id));

    await db
      .delete(sessions)
      .where(eq(sessions.userId, user.id));

    // Create fresh session for the user
    await createAuthSession(
      { id: user.id, email: user.email, role: user.role },
      req
    );

    return NextResponse.json({
      success: true,
      message: "Password has been successfully reset. You are now logged in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
