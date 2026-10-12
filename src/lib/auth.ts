import { cookies } from "next/headers";
import { verifyToken, type TokenPayload } from "./jwt";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("token")?.value;
}

export async function getCurrentUser(): Promise<
  | (TokenPayload & { id: number; name: string; passwordHash: string })
  | null
> {
  const token = await getAuthCookie();
  if (!token) return null;

  const payload = verifyToken(token);
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
  if (user.role !== "organizer") {
    throw new Error("Forbidden");
  }
  return user;
}
