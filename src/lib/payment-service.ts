import { db } from "@/db";
import { paymentLogs, users, bookings } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export interface EmiPlan {
  tenureMonths: number;
  monthlyAmountCents: number;
  interestRateAnnual: number;
  totalInterestCents: number;
  totalPayableCents: number;
}

export function calculateEmiPlans(totalCents: number): EmiPlan[] {
  const tenures = [
    { months: 3, rate: 12 },
    { months: 6, rate: 13.5 },
    { months: 9, rate: 14 },
    { months: 12, rate: 15 },
  ];

  return tenures.map((t) => {
    const monthlyRate = t.rate / 12 / 100;
    const emi =
      (totalCents * monthlyRate * Math.pow(1 + monthlyRate, t.months)) /
      (Math.pow(1 + monthlyRate, t.months) - 1);
    const monthlyAmountCents = Math.round(emi);
    const totalPayableCents = monthlyAmountCents * t.months;
    const totalInterestCents = totalPayableCents - totalCents;

    return {
      tenureMonths: t.months,
      monthlyAmountCents,
      interestRateAnnual: t.rate,
      totalInterestCents,
      totalPayableCents,
    };
  });
}

export async function recordPaymentLog(data: {
  bookingId?: number;
  userId?: number;
  gateway: "stripe" | "razorpay" | "paypal" | "upi" | "wallet";
  transactionId: string;
  amountCents: number;
  status?: "initiated" | "succeeded" | "failed" | "refunded";
  paymentMethodDetails?: Record<string, any>;
  errorMessage?: string;
}) {
  const [log] = await db
    .insert(paymentLogs)
    .values({
      bookingId: data.bookingId,
      userId: data.userId,
      gateway: data.gateway,
      transactionId: data.transactionId,
      amountCents: data.amountCents,
      status: data.status || "succeeded",
      paymentMethodDetails: data.paymentMethodDetails
        ? JSON.stringify(data.paymentMethodDetails)
        : null,
      errorMessage: data.errorMessage,
    })
    .returning();

  return log;
}

export async function processWalletPayment(
  userId: number,
  amountCents: number,
  bookingId?: number
) {
  return await db.transaction(async (tx) => {
    const user = await tx.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new Error("User not found");
    }

    const currentBalance = user.walletBalanceCents || 0;
    if (currentBalance < amountCents) {
      const shortRupees = ((amountCents - currentBalance) / 100).toLocaleString("en-IN");
      throw new Error(`Insufficient wallet balance. You need ₹${shortRupees} more.`);
    }

    const newBalance = currentBalance - amountCents;
    await tx
      .update(users)
      .set({ walletBalanceCents: newBalance })
      .where(eq(users.id, userId));

    const txnId = `WAL-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    await tx.insert(paymentLogs).values({
      bookingId,
      userId,
      gateway: "wallet",
      transactionId: txnId,
      amountCents,
      status: "succeeded",
      paymentMethodDetails: JSON.stringify({ type: "gatherly_wallet_debit", balanceBefore: currentBalance, balanceAfter: newBalance }),
    });

    return {
      success: true,
      transactionId: txnId,
      newBalanceCents: newBalance,
    };
  });
}

export async function processRefundAutomation(
  bookingId: number,
  reason = "User cancellation refund"
) {
  return await db.transaction(async (tx) => {
    const booking = await tx.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.refundStatus === "refunded") {
      throw new Error("Booking has already been refunded");
    }

    const refundAmountCents = booking.totalCents;

    // Credit user wallet
    if (refundAmountCents > 0) {
      await tx
        .update(users)
        .set({
          walletBalanceCents: sql`${users.walletBalanceCents} + ${refundAmountCents}`,
        })
        .where(eq(users.id, booking.userId));
    }

    const refundTxnId = `REF-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Update booking refund status
    await tx
      .update(bookings)
      .set({
        refundStatus: "refunded",
        refundAmountCents,
        cancellationReason: reason,
      })
      .where(eq(bookings.id, bookingId));

    // Record in payment logs
    await tx.insert(paymentLogs).values({
      bookingId,
      userId: booking.userId,
      gateway: "wallet",
      transactionId: refundTxnId,
      amountCents: refundAmountCents,
      status: "refunded",
      paymentMethodDetails: JSON.stringify({ reason, refundType: "wallet_credit" }),
    });

    return {
      success: true,
      refundTransactionId: refundTxnId,
      refundAmountCents,
    };
  });
}
