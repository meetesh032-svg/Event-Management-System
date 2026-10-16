import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/lib/payments/payment-service";
import { PaymentGatewayId } from "@/lib/payments/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const rawBody = await req.text();

    const headersObj: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersObj[key] = value;
    });

    const result = await paymentService.handleWebhook(provider as PaymentGatewayId, {
      headers: headersObj,
      rawBody,
    });

    return NextResponse.json({ received: true, event: result });
  } catch (error) {
    console.error("Webhook processing error:", error);
    const message = error instanceof Error ? error.message : "Webhook error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
