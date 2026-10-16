import { cookies } from "next/headers";
import { verifyToken, type TokenPayload } from "./jwt";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("token")?.value;
}

export async function getRefreshTokenCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("refreshToken")?.value;
}

export type AuthenticatedUser = TokenPayload & {
  id: number;
  name: string;
  passwordHash: string;
  avatarUrl?: string | null;
  isEmailVerified?: boolean;
  mfaEnabled?: boolean;
  bio?: string | null;
  phone?: string | null;
  isVerifiedOrganizer?: boolean;
  walletBalanceCents?: number;
};

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const token = await getAuthCookie();
  let payload: TokenPayload | null = token ? verifyToken(token) : null;

  // Transparent session recovery via refresh token if access token expired
  if (!payload) {
    const rawRefreshToken = await getRefreshTokenCookie();
    if (rawRefreshToken) {
      const { rotateRefreshToken } = await import("./auth-service");
      const rotationResult = await rotateRefreshToken(rawRefreshToken);
      if (rotationResult) {
        payload = verifyToken(rotationResult.accessToken);
      }
    }
  }

  if (!payload) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.userId),
  });

  if (!user) return null;

  return {
    ...payload,
    id: user.id,
    name: user.name,
    passwordHash: user.passwordHash,
    avatarUrl: user.avatarUrl,
    isEmailVerified: user.isEmailVerified,
    mfaEnabled: user.mfaEnabled,
    bio: user.bio,
    phone: user.phone,
    isVerifiedOrganizer: user.isVerifiedOrganizer,
    walletBalanceCents: user.walletBalanceCents,
  };
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireOrganizer() {
  const user = await requireAuth();
  if (user.role !== "organizer" && user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return user;
}
