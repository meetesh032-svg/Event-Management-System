import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { ilike, or, eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )
      );
    }

    if (role && role !== "all") {
      conditions.push(eq(users.role, role as any));
    }

    const query = db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isVerifiedOrganizer: users.isVerifiedOrganizer,
        isEmailVerified: users.isEmailVerified,
        avatarUrl: users.avatarUrl,
        walletBalanceCents: users.walletBalanceCents,
        createdAt: users.createdAt,
      })
      .from(users);

    const results = conditions.length > 0
      ? await query.where(or(...conditions)).orderBy(desc(users.createdAt)).limit(100)
      : await query.orderBy(desc(users.createdAt)).limit(100);

    return NextResponse.json({ users: results });
  } catch (error) {
    console.error("Admin get users error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
