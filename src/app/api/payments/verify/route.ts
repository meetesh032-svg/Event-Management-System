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
      rawPayload,
    } = body;

    if (!orderId && !gatewayOrderId && !gatewayPaymentId) {
      return NextResponse.json({ error: "Missing required order identifier" }, { status: 400 });
    }

    const effectiveOrderId = orderId || gatewayOrderId || gatewayPaymentId;

    const result = await paymentService.verifyAndCompletePayment({
      gatewayId: gatewayId as PaymentGatewayId,
      verifyInput: {
        orderId: effectiveOrderId,
        gatewayPaymentId: gatewayPaymentId || effectiveOrderId,
        gatewayOrderId: gatewayOrderId || undefined,
        gatewaySignature: gatewaySignature || undefined,
        amountCents: 0, // Backend retrieves and validates strict order amount from database
        rawPayload,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Payment verification endpoint error:", error);
    const message = error instanceof Error ? error.message : "Payment verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
