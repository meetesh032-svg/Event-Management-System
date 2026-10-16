import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { verifyTotpCode } from "@/lib/totp";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { secret, code, backupCodes } = await req.json();

    if (!secret || !code) {
      return NextResponse.json(
        { error: "Secret and 6-digit verification code are required" },
        { status: 400 }
      );
    }

    const isValid = verifyTotpCode(secret, code.trim());
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid 6-digit code. Please verify the code in your Authenticator app and try again." },
        { status: 400 }
      );
    }

    const serializedBackupCodes = Array.isArray(backupCodes)
      ? JSON.stringify(backupCodes)
      : null;

    await db
      .update(users)
      .set({
        mfaSecret: secret,
        mfaEnabled: true,
        mfaBackupCodes: serializedBackupCodes,
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      success: true,
      message: "Two-factor authentication has been successfully activated on your account.",
    });
  } catch (error) {
    console.error("MFA verify error:", error);
    return NextResponse.json({ error: "Unauthorized or verification failed" }, { status: 401 });
  }
}
