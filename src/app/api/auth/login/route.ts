import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createAuthSession } from "@/lib/auth-service";
import { verifyTotpCode } from "@/lib/totp";

export async function POST(req: NextRequest) {
  try {
    const { email, password, mfaCode, backupCode } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Check if MFA is enabled for this account
    if (user.mfaEnabled && user.mfaSecret) {
      // If code was not submitted yet, prompt user for MFA verification
      if (!mfaCode && !backupCode) {
        return NextResponse.json({
          requiresMfa: true,
          email: user.email,
          message: "Please enter your 6-digit Authenticator code or backup code.",
        });
      }

      let mfaVerified = false;

      // 1. Verify TOTP code
      if (mfaCode) {
        mfaVerified = verifyTotpCode(user.mfaSecret, mfaCode.trim());
      }

      // 2. Or verify Emergency Backup Code
      if (!mfaVerified && backupCode && user.mfaBackupCodes) {
        try {
          const codes: string[] = JSON.parse(user.mfaBackupCodes);
          const formattedInput = backupCode.trim().toUpperCase();
          const matchIndex = codes.indexOf(formattedInput);

          if (matchIndex !== -1) {
            mfaVerified = true;
            // Remove used backup code
            codes.splice(matchIndex, 1);
            await db
              .update(users)
              .set({ mfaBackupCodes: JSON.stringify(codes) })
              .where(eq(users.id, user.id));
          }
        } catch {
          // invalid json backup codes
        }
      }

      if (!mfaVerified) {
        return NextResponse.json(
          { error: "Invalid two-factor authentication code or backup code." },
          { status: 401 }
        );
      }
    }

    // Create session, access token, and refresh token
    await createAuthSession(
      { id: user.id, email: user.email, role: user.role },
      req
    );

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        isEmailVerified: user.isEmailVerified,
        mfaEnabled: user.mfaEnabled,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
