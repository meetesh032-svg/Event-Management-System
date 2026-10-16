import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateSecureToken } from "@/lib/auth-service";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.isEmailVerified) {
      return NextResponse.json({ message: "Email is already verified" });
    }

    const verificationToken = generateSecureToken(32);
    await db
      .update(users)
      .set({ emailVerificationToken: verificationToken })
      .where(eq(users.id, user.id));

    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/verify-email?token=${verificationToken}`;

    return NextResponse.json({
      success: true,
      message: "Verification link generated",
      verificationUrl,
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
