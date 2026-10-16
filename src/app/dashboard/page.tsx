import Link from "next/link";
import { requireOrganizer } from "@/lib/auth";
import { db } from "@/db";
import { events, bookings, users } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import OrganizerDashboardClient from "./OrganizerDashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireOrganizer();

  // 1. Fetch organizer events
  const myEvents = await db
    .select({
      id: events.id,
      title: events.title,
      category: events.category,
      status: events.status,
      startsAt: events.startsAt,
      capacity: events.capacity,
      ticketsRemaining: events.ticketsRemaining,
      ticketPriceCents: events.ticketPriceCents,
    })
    .from(events)
    .where(eq(events.organizerId, user.id))
    .orderBy(desc(events.createdAt));

  const eventIds = myEvents.map((e) => e.id);

  // 2. Fetch booking sales aggregation
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

  // 3. Compute summaries
  let totalRevenueCents = 0;
  let totalTicketsSold = 0;
  let totalCapacity = 0;
  let publishedCount = 0;
  let draftCount = 0;
  let scheduledCount = 0;

  const serializedEvents = myEvents.map((e) => {
    const sales = eventSalesMap[e.id] || { ticketsSold: 0, revenueCents: 0, bookingCount: 0 };
    totalRevenueCents += sales.revenueCents;
    totalTicketsSold += sales.ticketsSold;
    totalCapacity += e.capacity;

    if (e.status === "draft") draftCount++;
    else if (e.status === "scheduled") scheduledCount++;
    else publishedCount++;

    const occupancyRate = e.capacity > 0 ? Math.round((sales.ticketsSold / e.capacity) * 100) : 0;

    return {
      id: e.id,
      title: e.title,
      category: e.category,
      status: e.status,
      startsAt: e.startsAt.toISOString(),
      capacity: e.capacity,
      ticketsRemaining: e.ticketsRemaining,
      bookingsCount: sales.bookingCount,
      ticketsSold: sales.ticketsSold,
      revenueCents: sales.revenueCents,
      occupancyRate,
    };
  });

  const overallOccupancy = totalCapacity > 0 ? Math.round((totalTicketsSold / totalCapacity) * 100) : 0;

  // 4. Fetch recent sales
  let recentBookings: any[] = [];
  if (eventIds.length > 0) {
    const bookingsData = await db
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
      .limit(6);

    recentBookings = bookingsData.map((b) => ({
      ...b,
      createdAt: b.createdAt.toISOString(),
    }));
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Organizer Dashboard</h1>
            <p className="mt-1 text-sm text-slate-400">
              Real-time ticket sales, event lifecycle management, and attendee analytics.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/analytics"
              className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white transition shadow-lg shadow-indigo-600/30"
            >
              <span>View Executive Analytics & Peak Hours →</span>
            </Link>
          </div>
        </div>

        <OrganizerDashboardClient
          summary={{
            totalRevenueCents,
            totalTicketsSold,
            totalEvents: myEvents.length,
            publishedCount,
            draftCount,
            scheduledCount,
            overallOccupancy,
          }}
          events={serializedEvents}
          recentBookings={recentBookings}
        />
      </div>
    </div>
  );
}
