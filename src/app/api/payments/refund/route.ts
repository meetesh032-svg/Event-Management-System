import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { paymentService } from "@/lib/payments/payment-service";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { bookingId, amountCents, reason } = body;

    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
    }

    const result = await paymentService.processRefund({
      bookingId: Number(bookingId),
      amountCents: amountCents ? Number(amountCents) : undefined,
      reason: reason || "User requested refund",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Refund error:", error);
    const message = error instanceof Error ? error.message : "Refund failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
