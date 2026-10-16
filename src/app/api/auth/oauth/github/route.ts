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
    maxAge: 600,
    path: "/",
  });

  const clientId = process.env.GITHUB_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/oauth/github/callback`;

  if (!clientId) {
    // Development / Academic Demo sandbox fallback
    return NextResponse.redirect(
      new URL(`/api/auth/oauth/github/callback?code=demo_github_auth_code&state=${state}`, req.url)
    );
  }

  const githubUrl = new URL("https://github.com/login/oauth/authorize");
  githubUrl.searchParams.set("client_id", clientId);
  githubUrl.searchParams.set("redirect_uri", redirectUri);
  githubUrl.searchParams.set("scope", "user:email read:user");
  githubUrl.searchParams.set("state", state);

  return NextResponse.redirect(githubUrl.toString());
}
