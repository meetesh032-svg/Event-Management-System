import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { paymentLogs, bookings, events } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    const logs = await db
      .select({
        id: paymentLogs.id,
        transactionId: paymentLogs.transactionId,
        gateway: paymentLogs.gateway,
        amountCents: paymentLogs.amountCents,
        currency: paymentLogs.currency,
        status: paymentLogs.status,
        paymentMethodDetails: paymentLogs.paymentMethodDetails,
        createdAt: paymentLogs.createdAt,
      })
      .from(paymentLogs)
      .where(eq(paymentLogs.userId, user.id))
      .orderBy(desc(paymentLogs.createdAt));

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Get payment logs error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
