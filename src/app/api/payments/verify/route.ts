import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/lib/payments/payment-service";
import { PaymentGatewayId } from "@/lib/payments/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      gatewayId = "razorpay",
      orderId,
      gatewayPaymentId,
      gatewayOrderId,
      gatewaySignature,
      amountCents,
      metadata,
      rawPayload,
    } = body;

    if (!orderId || !metadata?.eventId || !metadata?.userId) {
      return NextResponse.json({ error: "Missing required order metadata" }, { status: 400 });
    }

    const result = await paymentService.verifyAndCompletePayment({
      gatewayId: gatewayId as PaymentGatewayId,
      verifyInput: {
        orderId,
        gatewayPaymentId: gatewayPaymentId || orderId,
        gatewayOrderId,
        gatewaySignature,
        amountCents: Number(amountCents) || metadata.totalCents,
        rawPayload,
      },
      metadata: {
        eventId: Number(metadata.eventId),
        userId: Number(metadata.userId),
        quantity: Number(metadata.quantity) || 1,
        seats: metadata.seats || [],
        couponCode: metadata.couponCode || null,
        discountCents: Number(metadata.discountCents) || 0,
        totalCents: Number(metadata.totalCents),
        isGuest: metadata.isGuest || false,
        guestEmail: metadata.guestEmail || null,
        guestName: metadata.guestName || null,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Payment verification endpoint error:", error);
    const message = error instanceof Error ? error.message : "Payment verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
