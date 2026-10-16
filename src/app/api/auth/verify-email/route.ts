import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Verification token is required" }, { status: 400 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.emailVerificationToken, token.trim()),
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired verification token" }, { status: 400 });
    }

    await db
      .update(users)
      .set({
        isEmailVerified: true,
        emailVerificationToken: null,
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      success: true,
      message: "Email verified successfully!",
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/verify-email?status=missing", req.url));
  }

  const user = await db.query.users.findFirst({
    where: eq(users.emailVerificationToken, token.trim()),
  });

  if (!user) {
    return NextResponse.redirect(new URL("/verify-email?status=invalid", req.url));
  }

  await db
    .update(users)
    .set({
      isEmailVerified: true,
      emailVerificationToken: null,
    })
    .where(eq(users.id, user.id));

  return NextResponse.redirect(new URL("/verify-email?status=success", req.url));
}
