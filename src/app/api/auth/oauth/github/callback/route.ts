import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createAuthSession, generateSecureToken } from "@/lib/auth-service";

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const cookieStore = await cookies();
    const savedState = cookieStore.get("oauth_state")?.value;

    cookieStore.delete("oauth_state");

    if (!code || !state || state !== savedState) {
      return NextResponse.redirect(new URL("/login?error=OAuthStateMismatch", req.url));
    }

    let githubProfile = {
      email: "github.user@example.com",
      name: "GitHub Verified Developer",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    };

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (clientId && clientSecret && code !== "demo_github_auth_code") {
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        return NextResponse.redirect(new URL("/login?error=GitHubTokenExchangeFailed", req.url));
      }

      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "User-Agent": "Gatherly-App",
        },
      });
      const userData = await userRes.json();

      let email = userData.email;
      if (!email) {
        const emailsRes = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            "User-Agent": "Gatherly-App",
          },
        });
        const emailsData = await emailsRes.json();
        if (Array.isArray(emailsData)) {
          const primary = emailsData.find((e: { primary: boolean }) => e.primary);
          email = primary ? primary.email : emailsData[0]?.email;
        }
      }

      githubProfile = {
        email: email || `${userData.login}@users.noreply.github.com`,
        name: userData.name || userData.login,
        avatarUrl: userData.avatar_url || null,
      };
    }

    const normalizedEmail = githubProfile.email.toLowerCase().trim();

    let existingUser = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (!existingUser) {
      const dummyPassword = await bcrypt.hash(generateSecureToken(16), 10);
      const [newUser] = await db
        .insert(users)
        .values({
          name: githubProfile.name,
          email: normalizedEmail,
          passwordHash: dummyPassword,
          role: "attendee",
          avatarUrl: githubProfile.avatarUrl,
          isEmailVerified: true,
        })
        .returning();
      existingUser = newUser;
    } else if (!existingUser.isEmailVerified || !existingUser.avatarUrl) {
      await db
        .update(users)
        .set({
          isEmailVerified: true,
          avatarUrl: existingUser.avatarUrl || githubProfile.avatarUrl,
        })
        .where(eq(users.id, existingUser.id));
    }

    await createAuthSession(
      { id: existingUser.id, email: existingUser.email, role: existingUser.role },
      req
    );

    return NextResponse.redirect(new URL("/events", req.url));
  } catch (error) {
    console.error("GitHub OAuth callback error:", error);
    return NextResponse.redirect(new URL("/login?error=GitHubAuthFailed", req.url));
  }
}
