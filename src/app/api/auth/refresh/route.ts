import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { rotateRefreshToken } from "@/lib/auth-service";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const rawRefreshToken = cookieStore.get("refreshToken")?.value;

    if (!rawRefreshToken) {
      return NextResponse.json({ error: "No refresh token provided" }, { status: 401 });
    }

    const result = await rotateRefreshToken(rawRefreshToken, req);
    if (!result) {
      return NextResponse.json(
        { error: "Invalid, expired, or revoked refresh token. Please sign in again." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Access token refreshed successfully",
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return NextResponse.json({ error: "Failed to refresh token" }, { status: 500 });
  }
}
