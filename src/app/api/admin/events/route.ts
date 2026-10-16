import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  try {
    await requireAdmin();

    const rows = await db
      .select({
        id: events.id,
        title: events.title,
        category: events.category,
        location: events.location,
        startsAt: events.startsAt,
        capacity: events.capacity,
        ticketsRemaining: events.ticketsRemaining,
        ticketPriceCents: events.ticketPriceCents,
        status: events.status,
        isFeatured: events.isFeatured,
        createdAt: events.createdAt,
        organizerName: users.name,
        organizerEmail: users.email,
        isVerifiedOrganizer: users.isVerifiedOrganizer,
      })
      .from(events)
      .leftJoin(users, eq(events.organizerId, users.id))
      .orderBy(desc(events.createdAt));

    return NextResponse.json({ events: rows });
  } catch (error) {
    console.error("Admin get events error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
