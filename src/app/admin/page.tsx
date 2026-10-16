import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { users, venues, events, bookings, paymentLogs, auditLogs } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import AdminDashboardClient from "./AdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdmin();

  // 1. Metrics
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

  // 2. Users list
  const usersData = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isVerifiedOrganizer: users.isVerifiedOrganizer,
      isEmailVerified: users.isEmailVerified,
      walletBalanceCents: users.walletBalanceCents,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(100);

  // 3. Venues list
  const venuesData = await db
    .select({
      id: venues.id,
      name: venues.name,
      address: venues.address,
      city: venues.city,
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

  // 4. Events list
  const eventsData = await db
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
      organizerName: users.name,
      organizerEmail: users.email,
    })
    .from(events)
    .leftJoin(users, eq(events.organizerId, users.id))
    .orderBy(desc(events.createdAt));

  // 5. Fraud Data
  const refundHeavyUsers = await db
    .select({
      userId: bookings.userId,
      userName: users.name,
      userEmail: users.email,
      refundCount: sql<number>`COUNT(${bookings.id})`.mapWith(Number),
      totalRefundedCents: sql<number>`COALESCE(SUM(${bookings.refundAmountCents}), 0)`.mapWith(Number),
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .where(eq(bookings.refundStatus, "refunded"))
    .groupBy(bookings.userId, users.name, users.email)
    .limit(20);

  const fraudAlerts: any[] = [];
  for (const u of refundHeavyUsers) {
    if (u.refundCount >= 2) {
      fraudAlerts.push({
        level: "warning",
        category: "Excessive Refunds",
        title: `User ${u.userName} has ${u.refundCount} refunds`,
        description: `Total refunded: ₹${(u.totalRefundedCents / 100).toLocaleString("en-IN")}. Recommended to inspect account activity.`,
        userEmail: u.userEmail,
      });
    }
  }

  // 6. Audit Logs
  const auditLogsData = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      targetType: auditLogs.targetType,
      targetId: auditLogs.targetId,
      details: auditLogs.details,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(50);

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-white">Platform Administration</h1>
            <span className="rounded-full bg-rose-500/20 border border-rose-500/30 px-3 py-0.5 text-xs font-bold text-rose-300">
              Admin Console
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            System governance, organizer approvals, venue moderation, security fraud detection, and audit trails.
          </p>
        </div>

        <AdminDashboardClient
          metrics={{
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
          }}
          users={usersData.map((u) => ({
            ...u,
            createdAt: u.createdAt.toISOString(),
          }))}
          venues={venuesData.map((v) => ({
            ...v,
            createdAt: v.createdAt.toISOString(),
          }))}
          events={eventsData.map((e) => ({
            ...e,
            startsAt: e.startsAt.toISOString(),
          }))}
          fraudData={{
            alerts: fraudAlerts,
            refundHeavyUsers,
            failedPayments: [],
            highValueBookings: [],
          }}
          auditLogs={auditLogsData.map((a) => ({
            ...a,
            createdAt: a.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
