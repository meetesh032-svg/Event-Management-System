import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, users } from "@/db/schema";
import { requireOrganizer } from "@/lib/auth";
import { and, eq, gte, ilike, inArray, lte, or, asc, desc, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const category = searchParams.get("category") ?? "";
    const city = searchParams.get("city") ?? "";
    const priceRange = searchParams.get("priceRange") ?? "";
    const dateFilter = searchParams.get("dateFilter") ?? "";
    const date = searchParams.get("date") ?? "";
    const sort = searchParams.get("sort") ?? "soonest";
    const statusFilter = searchParams.get("status");

    const conditions = [];

    // Filter by status (default to published for public discovery)
    if (statusFilter && statusFilter !== "all") {
      conditions.push(eq(events.status, statusFilter));
    } else if (!statusFilter) {
      conditions.push(eq(events.status, "published"));
    }

    // Smart Multi-Field Search (title, description, location)
    if (search) {
      conditions.push(
        or(
          ilike(events.title, `%${search}%`),
          ilike(events.description, `%${search}%`),
          ilike(events.location, `%${search}%`)
        )
      );
    }

    // Category Filtering
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

    // City / Nearby Geolocation Filter
    if (city && city.toLowerCase() !== "all") {
      conditions.push(ilike(events.location, `%${city}%`));
    }

    // Price Range Filter
    if (priceRange) {
      if (priceRange === "free") {
        conditions.push(eq(events.ticketPriceCents, 0));
      } else if (priceRange === "under_500") {
        conditions.push(lte(events.ticketPriceCents, 50000));
      } else if (priceRange === "500_2000") {
        conditions.push(
          and(
            gte(events.ticketPriceCents, 50000),
            lte(events.ticketPriceCents, 200000)
          )
        );
      } else if (priceRange === "above_2000") {
        conditions.push(gte(events.ticketPriceCents, 200000));
      }
    }

    // Date Presets & Custom Date
    if (dateFilter) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateFilter === "today") {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        conditions.push(gte(events.startsAt, today), lte(events.startsAt, tomorrow));
      } else if (dateFilter === "tomorrow") {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);
        conditions.push(gte(events.startsAt, tomorrow), lte(events.startsAt, dayAfter));
      } else if (dateFilter === "weekend") {
        // Find next Saturday and Sunday
        const dayOfWeek = today.getDay();
        const daysUntilSat = (6 - dayOfWeek + 7) % 7;
        const sat = new Date(today);
        sat.setDate(sat.getDate() + daysUntilSat);
        const mon = new Date(sat);
        mon.setDate(mon.getDate() + 2);
        conditions.push(gte(events.startsAt, sat), lte(events.startsAt, mon));
      }
    } else if (date) {
      const start = new Date(date);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      conditions.push(gte(events.startsAt, start), lte(events.startsAt, end));
    }

    // Sorting Engine
    let orderByClause = asc(events.startsAt);
    if (sort === "price_asc") {
      orderByClause = asc(events.ticketPriceCents);
    } else if (sort === "price_desc") {
      orderByClause = desc(events.ticketPriceCents);
    } else if (sort === "popular") {
      orderByClause = sql`${events.capacity} - ${events.ticketsRemaining} DESC`;
    }

    const rows = await db
      .select({
        event: events,
        organizerName: users.name,
        isVerifiedOrganizer: users.isVerifiedOrganizer,
      })
      .from(events)
      .leftJoin(users, eq(events.organizerId, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(orderByClause);

    const result = rows.map((r) => ({
      ...r.event,
      organizerName: r.organizerName,
      isVerifiedOrganizer: r.isVerifiedOrganizer,
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
      status = "published",
      scheduledPublishAt,
      venueId,
      seatLayoutId,
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
        status,
        scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt) : null,
        venueId: venueId ? Number(venueId) : null,
        seatLayoutId: seatLayoutId ? Number(seatLayoutId) : null,
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
