import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, bookings, users } from "@/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { requireOrganizer } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  try {
    const user = await requireOrganizer();

    // 1. Get all events for organizer
    const organizerEvents = await db
      .select({
        id: events.id,
        title: events.title,
        status: events.status,
        startsAt: events.startsAt,
        capacity: events.capacity,
        ticketsRemaining: events.ticketsRemaining,
        ticketPriceCents: events.ticketPriceCents,
        createdAt: events.createdAt,
      })
      .from(events)
      .where(eq(events.organizerId, user.id))
      .orderBy(desc(events.createdAt));

    const eventIds = organizerEvents.map((e) => e.id);

    // 2. Aggregate sales per event
    let eventSalesMap: Record<number, { ticketsSold: number; revenueCents: number; bookingCount: number }> = {};

    if (eventIds.length > 0) {
      const salesQuery = await db
        .select({
          eventId: bookings.eventId,
          ticketsSold: sql<number>`COALESCE(SUM(${bookings.quantity}), 0)`.mapWith(Number),
          revenueCents: sql<number>`COALESCE(SUM(${bookings.totalCents}), 0)`.mapWith(Number),
          bookingCount: sql<number>`COUNT(${bookings.id})`.mapWith(Number),
        })
        .from(bookings)
        .where(sql`${bookings.eventId} IN ${eventIds}`)
        .groupBy(bookings.eventId);

      for (const s of salesQuery) {
        eventSalesMap[s.eventId] = {
          ticketsSold: s.ticketsSold,
          revenueCents: s.revenueCents,
          bookingCount: s.bookingCount,
        };
      }
    }

    // 3. Compute totals
    let totalRevenueCents = 0;
    let totalTicketsSold = 0;
    let totalCapacity = 0;
    let publishedCount = 0;
    let draftCount = 0;
    let scheduledCount = 0;

    const breakdown = organizerEvents.map((e) => {
      const sales = eventSalesMap[e.id] || { ticketsSold: 0, revenueCents: 0, bookingCount: 0 };
      totalRevenueCents += sales.revenueCents;
      totalTicketsSold += sales.ticketsSold;
      totalCapacity += e.capacity;

      if (e.status === "draft") draftCount++;
      else if (e.status === "scheduled") scheduledCount++;
      else publishedCount++;

      const occupancyRate = e.capacity > 0 ? Math.round((sales.ticketsSold / e.capacity) * 100) : 0;

      return {
        ...e,
        ticketsSold: sales.ticketsSold,
        revenueCents: sales.revenueCents,
        bookingCount: sales.bookingCount,
        occupancyRate,
      };
    });

    // 4. Fetch recent bookings
    let recentBookings: any[] = [];
    if (eventIds.length > 0) {
      recentBookings = await db
        .select({
          id: bookings.id,
          reference: bookings.reference,
          quantity: bookings.quantity,
          totalCents: bookings.totalCents,
          status: bookings.status,
          createdAt: bookings.createdAt,
          eventTitle: events.title,
          attendeeName: users.name,
          attendeeEmail: users.email,
        })
        .from(bookings)
        .innerJoin(events, eq(bookings.eventId, events.id))
        .innerJoin(users, eq(bookings.userId, users.id))
        .where(eq(events.organizerId, user.id))
        .orderBy(desc(bookings.createdAt))
        .limit(8);
    }

    const overallOccupancy = totalCapacity > 0 ? Math.round((totalTicketsSold / totalCapacity) * 100) : 0;

    return NextResponse.json({
      summary: {
        totalRevenueCents,
        totalTicketsSold,
        totalEvents: organizerEvents.length,
        publishedCount,
        draftCount,
        scheduledCount,
        overallOccupancy,
      },
      events: breakdown,
      recentBookings,
    });
  } catch (error) {
    console.error("Organizer analytics error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
