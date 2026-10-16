import { NextRequest, NextResponse } from "next/server";
import { generateSecureToken } from "@/lib/auth-service";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const state = generateSecureToken(16);
  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/oauth/google/callback`;

  if (!clientId) {
    // Development / Academic Demo sandbox mode
    return NextResponse.redirect(
      new URL(`/api/auth/oauth/google/callback?code=demo_google_auth_code&state=${state}`, req.url)
    );
  }

  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleUrl.searchParams.set("client_id", clientId);
  googleUrl.searchParams.set("redirect_uri", redirectUri);
  googleUrl.searchParams.set("response_type", "code");
  googleUrl.searchParams.set("scope", "openid email profile");
  googleUrl.searchParams.set("state", state);
  googleUrl.searchParams.set("access_type", "offline");
  googleUrl.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(googleUrl.toString());
}
