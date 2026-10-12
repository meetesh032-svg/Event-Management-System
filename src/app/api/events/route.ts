import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, users } from "@/db/schema";
import { requireOrganizer } from "@/lib/auth";
import { and, eq, gte, ilike, inArray, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const category = searchParams.get("category") ?? "";
    const date = searchParams.get("date") ?? "";

    const conditions = [];
    if (search) {
      conditions.push(ilike(events.title, `%${search}%`));
    }
    if (category && category.toLowerCase() !== "all") {
      if (category.toLowerCase() === "events") {
        conditions.push(
          inArray(events.category, [
            "Events",
            "Music",
            "Tech",
            "Food",
            "Business",
            "Arts",
            "Comedy",
            "Workshops",
          ])
        );
      } else {
        conditions.push(ilike(events.category, category));
      }
    }
    if (date) {
      const start = new Date(date);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      conditions.push(gte(events.startsAt, start), lte(events.startsAt, end));
    }

    const rows = await db
      .select({
        event: events,
        organizerName: users.name,
      })
      .from(events)
      .leftJoin(users, eq(events.organizerId, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(events.startsAt);

    const result = rows.map((r) => ({
      ...r.event,
      organizerName: r.organizerName,
    }));

    return NextResponse.json({ events: result });
  } catch (error) {
    console.error("List events error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganizer();
    const body = await req.json();
    const {
      title,
      description,
      category,
      location,
      startsAt,
      endsAt,
      ticketPriceCents,
      capacity,
      imageUrl,
    } = body;

    if (!title || !description || !category || !location || !startsAt || !endsAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const safeCapacity = Number(capacity) || 0;
    const safePrice = Number(ticketPriceCents) || 0;

    const [event] = await db
      .insert(events)
      .values({
        title,
        description,
        category,
        location,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        ticketPriceCents: safePrice,
        capacity: safeCapacity,
        ticketsRemaining: safeCapacity,
        imageUrl,
        organizerId: user.id,
      })
      .returning();

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("Create event error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
