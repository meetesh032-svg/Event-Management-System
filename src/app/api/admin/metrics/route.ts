import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, events, venues, bookings, paymentLogs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  try {
    await requireAdmin();

    const [bookingStats] = await db
      .select({
        totalGmvCents: sql<number>`COALESCE(SUM(${bookings.totalCents}), 0)`.mapWith(Number),
        totalTicketsSold: sql<number>`COALESCE(SUM(${bookings.quantity}), 0)`.mapWith(Number),
        totalBookings: sql<number>`COUNT(${bookings.id})`.mapWith(Number),
      })
      .from(bookings);

    const [userStats] = await db
      .select({
        totalUsers: sql<number>`COUNT(${users.id})`.mapWith(Number),
        totalOrganizers: sql<number>`COUNT(CASE WHEN ${users.role} = 'organizer' THEN 1 END)`.mapWith(Number),
        verifiedOrganizers: sql<number>`COUNT(CASE WHEN ${users.isVerifiedOrganizer} = true THEN 1 END)`.mapWith(Number),
      })
      .from(users);

    const [venueStats] = await db
      .select({
        totalVenues: sql<number>`COUNT(${venues.id})`.mapWith(Number),
        approvedVenues: sql<number>`COUNT(CASE WHEN ${venues.isApproved} = true THEN 1 END)`.mapWith(Number),
        pendingVenues: sql<number>`COUNT(CASE WHEN ${venues.isApproved} = false THEN 1 END)`.mapWith(Number),
      })
      .from(venues);

    const [eventStats] = await db
      .select({
        totalEvents: sql<number>`COUNT(${events.id})`.mapWith(Number),
        publishedEvents: sql<number>`COUNT(CASE WHEN ${events.status} = 'published' THEN 1 END)`.mapWith(Number),
        featuredEvents: sql<number>`COUNT(CASE WHEN ${events.isFeatured} = true THEN 1 END)`.mapWith(Number),
      })
      .from(events);

    const [fraudStats] = await db
      .select({
        failedTransactions: sql<number>`COUNT(CASE WHEN ${paymentLogs.status} = 'failed' THEN 1 END)`.mapWith(Number),
        refundedTransactions: sql<number>`COUNT(CASE WHEN ${paymentLogs.status} = 'refunded' THEN 1 END)`.mapWith(Number),
      })
      .from(paymentLogs);

    return NextResponse.json({
      metrics: {
        totalGmvCents: bookingStats.totalGmvCents,
        totalTicketsSold: bookingStats.totalTicketsSold,
        totalBookings: bookingStats.totalBookings,
        totalUsers: userStats.totalUsers,
        totalOrganizers: userStats.totalOrganizers,
        verifiedOrganizers: userStats.verifiedOrganizers,
        unverifiedOrganizers: Math.max(0, userStats.totalOrganizers - userStats.verifiedOrganizers),
        totalVenues: venueStats.totalVenues,
        approvedVenues: venueStats.approvedVenues,
        pendingVenues: venueStats.pendingVenues,
        totalEvents: eventStats.totalEvents,
        publishedEvents: eventStats.publishedEvents,
        featuredEvents: eventStats.featuredEvents,
        failedTransactions: fraudStats.failedTransactions,
        refundedTransactions: fraudStats.refundedTransactions,
      },
    });
  } catch (error) {
    console.error("Admin metrics error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
