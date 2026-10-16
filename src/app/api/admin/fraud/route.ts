import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { paymentLogs, bookings, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { desc, eq, sql } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  try {
    await requireAdmin();

    // 1. Users with multiple refunds
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
      .having(sql`COUNT(${bookings.id}) >= 1`)
      .limit(20);

    // 2. Failed payment spikes
    const failedPayments = await db
      .select({
        id: paymentLogs.id,
        transactionId: paymentLogs.transactionId,
        gateway: paymentLogs.gateway,
        amountCents: paymentLogs.amountCents,
        errorMessage: paymentLogs.errorMessage,
        createdAt: paymentLogs.createdAt,
        userId: paymentLogs.userId,
        userName: users.name,
        userEmail: users.email,
      })
      .from(paymentLogs)
      .leftJoin(users, eq(paymentLogs.userId, users.id))
      .where(eq(paymentLogs.status, "failed"))
      .orderBy(desc(paymentLogs.createdAt))
      .limit(25);

    // 3. High-value transactions (> ₹50,000)
    const highValueBookings = await db
      .select({
        id: bookings.id,
        reference: bookings.reference,
        totalCents: bookings.totalCents,
        quantity: bookings.quantity,
        status: bookings.status,
        createdAt: bookings.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(bookings)
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(sql`${bookings.totalCents} >= 5000000`)
      .orderBy(desc(bookings.createdAt))
      .limit(20);

    // 4. Construct risk alerts
    const alerts: any[] = [];

    for (const u of refundHeavyUsers) {
      if (u.refundCount >= 2) {
        alerts.push({
          level: "warning",
          category: "Excessive Refunds",
          title: `User ${u.userName} has ${u.refundCount} refunds`,
          description: `Total refunded: ₹${(u.totalRefundedCents / 100).toLocaleString("en-IN")}. Recommended to inspect account activity.`,
          userEmail: u.userEmail,
        });
      }
    }

    if (failedPayments.length > 5) {
      alerts.push({
        level: "danger",
        category: "Gateway Failures",
        title: `${failedPayments.length} failed payment attempts detected`,
        description: "Elevated transaction failure rate detected across recent checkouts.",
      });
    }

    return NextResponse.json({
      alerts,
      refundHeavyUsers,
      failedPayments,
      highValueBookings,
    });
  } catch (error) {
    console.error("Admin fraud detection error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
