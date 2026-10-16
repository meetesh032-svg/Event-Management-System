import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json(
        { error: "Account password is required to disable 2FA" },
        { status: 400 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Incorrect password. 2FA was not disabled." },
        { status: 401 }
      );
    }

    await db
      .update(users)
      .set({
        mfaSecret: null,
        mfaEnabled: false,
        mfaBackupCodes: null,
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      success: true,
      message: "Two-factor authentication has been disabled.",
    });
  } catch (error) {
    console.error("MFA disable error:", error);
    return NextResponse.json({ error: "Unauthorized or action failed" }, { status: 401 });
  }
}
