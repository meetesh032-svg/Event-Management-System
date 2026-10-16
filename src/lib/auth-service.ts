import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, refreshTokens, sessions, type User } from "@/db/schema";
import { signToken } from "@/lib/jwt";
import { eq, and, gt } from "drizzle-orm";

/**
 * Hash raw token using SHA-256 for safe storage in database
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generate secure random token
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Parse client device info from User-Agent string
 */
export function parseDeviceInfo(userAgent: string | null): string {
  if (!userAgent) return "Unknown Device";
  let os = "Unknown OS";
  let browser = "Unknown Browser";

  if (/windows/i.test(userAgent)) os = "Windows";
  else if (/macintosh|mac os/i.test(userAgent)) os = "macOS";
  else if (/linux/i.test(userAgent)) os = "Linux";
  else if (/android/i.test(userAgent)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = "iOS";

  if (/edg/i.test(userAgent)) browser = "Edge";
  else if (/chrome/i.test(userAgent)) browser = "Chrome";
  else if (/firefox/i.test(userAgent)) browser = "Firefox";
  else if (/safari/i.test(userAgent)) browser = "Safari";

  return `${browser} on ${os}`;
}

/**
 * Create authentication session, issue access & refresh tokens, and set secure cookies
 */
export async function createAuthSession(
  user: { id: number; email: string; role: "attendee" | "organizer" | "admin" },
  req?: Request | null
) {
  // Extract client metadata
  const userAgent = req?.headers.get("user-agent") ?? "Unknown";
  const ipAddress =
    req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req?.headers.get("x-real-ip") ??
    "127.0.0.1";
  const deviceInfo = parseDeviceInfo(userAgent);

  // 1. Access Token (JWT)
  const accessToken = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // 2. Refresh Token
  const rawRefreshToken = generateSecureToken(40);
  const refreshTokenHash = hashToken(rawRefreshToken);
  const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: refreshTokenHash,
    expiresAt: refreshTokenExpiry,
    userAgent,
    ipAddress,
  });

  // 3. Active Session
  const sessionToken = generateSecureToken(32);
  const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.insert(sessions).values({
    userId: user.id,
    sessionToken,
    deviceInfo,
    ipAddress,
    lastActive: new Date(),
    expiresAt: sessionExpiry,
  });

  // 4. Set HttpOnly Cookies
  const cookieStore = await cookies();
  const isProd = process.env.NODE_ENV === "production";

  // Access token cookie (token)
  cookieStore.set("token", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  // Refresh token cookie (refreshToken)
  cookieStore.set("refreshToken", rawRefreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  // Session token cookie (sessionId)
  cookieStore.set("sessionId", sessionToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  return { accessToken, refreshToken: rawRefreshToken, sessionToken };
}

/**
 * Rotate refresh token: revoke old token and issue fresh token pair
 */
export async function rotateRefreshToken(
  rawRefreshToken: string,
  req?: Request | null
) {
  const oldHash = hashToken(rawRefreshToken);

  const existingToken = await db.query.refreshTokens.findFirst({
    where: and(
      eq(refreshTokens.tokenHash, oldHash),
      eq(refreshTokens.revoked, false),
      gt(refreshTokens.expiresAt, new Date())
    ),
  });

  if (!existingToken) {
    return null;
  }

  // Revoke old refresh token (Token Rotation guarantee)
  await db
    .update(refreshTokens)
    .set({ revoked: true })
    .where(eq(refreshTokens.id, existingToken.id));

  // Retrieve user
  const user = await db.query.users.findFirst({
    where: eq(users.id, existingToken.userId),
  });

  if (!user) return null;

  // Issue new session & tokens
  return createAuthSession(
    { id: user.id, email: user.email, role: user.role },
    req
  );
}

/**
 * Clear all authentication cookies
 */
export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete("token");
  cookieStore.delete("refreshToken");
  cookieStore.delete("sessionId");
}
