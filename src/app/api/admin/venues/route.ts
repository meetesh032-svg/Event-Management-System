import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { venues, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  try {
    await requireAdmin();

    const rows = await db
      .select({
        id: venues.id,
        name: venues.name,
        address: venues.address,
        city: venues.city,
        state: venues.state,
        capacity: venues.capacity,
        imageUrl: venues.imageUrl,
        isApproved: venues.isApproved,
        createdAt: venues.createdAt,
        organizerName: users.name,
        organizerEmail: users.email,
      })
      .from(venues)
      .leftJoin(users, eq(venues.organizerId, users.id))
      .orderBy(desc(venues.createdAt));

    return NextResponse.json({ venues: rows });
  } catch (error) {
    console.error("Admin get venues error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
