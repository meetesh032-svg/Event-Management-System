import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, bookings, users } from "@/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth();
    if (user.role !== "admin" && user.role !== "organizer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Overall Revenue & Ticket Sales
    const [summaryRow] = await db
      .select({
        totalRevenueCents: sql<number>`COALESCE(SUM(CASE WHEN ${bookings.status} = 'confirmed' THEN ${bookings.totalCents} ELSE 0 END), 0)`.mapWith(Number),
        totalTicketsSold: sql<number>`COALESCE(SUM(CASE WHEN ${bookings.status} = 'confirmed' THEN ${bookings.quantity} ELSE 0 END), 0)`.mapWith(Number),
        totalBookings: sql<number>`COUNT(${bookings.id})`.mapWith(Number),
        confirmedBookings: sql<number>`COALESCE(SUM(CASE WHEN ${bookings.status} = 'confirmed' THEN 1 ELSE 0 END), 0)`.mapWith(Number),
        cancelledBookings: sql<number>`COALESCE(SUM(CASE WHEN ${bookings.status} = 'cancelled' THEN 1 ELSE 0 END), 0)`.mapWith(Number),
      })
      .from(bookings);

    const totalBookings = summaryRow?.totalBookings || 0;
    const confirmedBookings = summaryRow?.confirmedBookings || 0;
    const conversionRate = totalBookings > 0 ? Math.round((confirmedBookings / totalBookings) * 100) : 100;

    // 2. Peak Booking Hours (24-hour distribution)
    const hoursDistribution = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${bookings.createdAt})::int`.mapWith(Number),
        count: sql<number>`COUNT(${bookings.id})`.mapWith(Number),
        revenueCents: sql<number>`COALESCE(SUM(${bookings.totalCents}), 0)`.mapWith(Number),
      })
      .from(bookings)
      .groupBy(sql`EXTRACT(HOUR FROM ${bookings.createdAt})::int`)
      .orderBy(sql`EXTRACT(HOUR FROM ${bookings.createdAt})::int`);

    // Normalize hours 0..23
    const peakHours = Array.from({ length: 24 }, (_, i) => {
      const match = hoursDistribution.find((h) => h.hour === i);
      return {
        hour: i,
        label: `${i.toString().padStart(2, "0")}:00`,
        count: match ? match.count : 0,
        revenueCents: match ? match.revenueCents : 0,
      };
    });

    // 3. Category Breakdown
    const categoryBreakdown = await db
      .select({
        category: events.category,
        ticketsSold: sql<number>`COALESCE(SUM(${bookings.quantity}), 0)`.mapWith(Number),
        revenueCents: sql<number>`COALESCE(SUM(${bookings.totalCents}), 0)`.mapWith(Number),
        eventCount: sql<number>`COUNT(DISTINCT ${events.id})`.mapWith(Number),
      })
      .from(events)
      .leftJoin(bookings, and(eq(events.id, bookings.eventId), eq(bookings.status, "confirmed")))
      .groupBy(events.category)
      .orderBy(desc(sql`COALESCE(SUM(${bookings.totalCents}), 0)`));

    // 4. Most Popular Events (by tickets sold and revenue)
    const popularEvents = await db
      .select({
        id: events.id,
        title: events.title,
        category: events.category,
        capacity: events.capacity,
        ticketsRemaining: events.ticketsRemaining,
        ticketsSold: sql<number>`COALESCE(SUM(${bookings.quantity}), 0)`.mapWith(Number),
        revenueCents: sql<number>`COALESCE(SUM(${bookings.totalCents}), 0)`.mapWith(Number),
      })
      .from(events)
      .leftJoin(bookings, and(eq(events.id, bookings.eventId), eq(bookings.status, "confirmed")))
      .groupBy(events.id, events.title, events.category, events.capacity, events.ticketsRemaining)
      .orderBy(desc(sql`COALESCE(SUM(${bookings.quantity}), 0)`))
      .limit(6);

    // 5. User Analytics (Total Users, Organizers, Active Attendees)
    const [userMetrics] = await db
      .select({
        totalUsers: sql<number>`COUNT(${users.id})`.mapWith(Number),
        organizersCount: sql<number>`COALESCE(SUM(CASE WHEN ${users.role} = 'organizer' THEN 1 ELSE 0 END), 0)`.mapWith(Number),
        verifiedOrganizers: sql<number>`COALESCE(SUM(CASE WHEN ${users.isVerifiedOrganizer} = true THEN 1 ELSE 0 END), 0)`.mapWith(Number),
      })
      .from(users);

    return NextResponse.json({
      summary: {
        totalRevenueCents: summaryRow?.totalRevenueCents || 0,
        totalTicketsSold: summaryRow?.totalTicketsSold || 0,
        totalBookings,
        confirmedBookings,
        cancelledBookings: summaryRow?.cancelledBookings || 0,
        conversionRate,
      },
      peakHours,
      categoryBreakdown,
      popularEvents: popularEvents.map((e) => ({
        ...e,
        occupancyRate: e.capacity > 0 ? Math.round((e.ticketsSold / e.capacity) * 100) : 0,
      })),
      userMetrics: {
        totalUsers: userMetrics?.totalUsers || 0,
        organizersCount: userMetrics?.organizersCount || 0,
        verifiedOrganizers: userMetrics?.verifiedOrganizers || 0,
      },
    });
  } catch (error) {
    console.error("Platform analytics error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
