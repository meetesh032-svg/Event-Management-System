import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createBookingFromSession } from "@/lib/booking";
import { paymentService } from "@/lib/payments/payment-service";
import { PaymentGatewayId } from "@/lib/payments/types";
import { db } from "@/db";
import { bookings, orders } from "@/db/schema";
import { eq, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");
    const bookingRef = searchParams.get("booking_ref");
    const gateway = searchParams.get("gateway") as PaymentGatewayId | null;
    const cfOrderId = searchParams.get("cf_order_id");
    const ppTxnId = searchParams.get("transactionId");
    const token = searchParams.get("token"); // PayPal order ID in return url
    const txnid = searchParams.get("txnid"); // PayU txn ID
    const encResp = searchParams.get("encResp"); // CCAvenue response

    // 1. Check if booking already confirmed and committed in database
    const identifier = bookingRef || sessionId || cfOrderId || ppTxnId || token || txnid;
    if (identifier) {
      const existing = await db.query.bookings.findFirst({
        where: or(eq(bookings.reference, identifier), eq(bookings.stripeSessionId, identifier)),
      });
      if (existing) {
        return NextResponse.json({ booking: existing });
      }
    }

    // 2. If Stripe session ID provided, verify directly with official Stripe API
    if (sessionId && sessionId.startsWith("cs_")) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== "paid") {
        return NextResponse.json(
          { error: `Payment not completed. Stripe payment status is "${session.payment_status}".` },
          { status: 402 }
        );
      }

      const booking = await createBookingFromSession(session);
      return NextResponse.json({ booking });
    }

    // 3. If Cashfree redirect return
    if (gateway === "cashfree" || cfOrderId) {
      const orderId = cfOrderId || sessionId;
      if (orderId) {
        const result = await paymentService.verifyAndCompletePayment({
          gatewayId: "cashfree",
          verifyInput: {
            orderId,
            gatewayPaymentId: orderId,
            gatewayOrderId: orderId,
            amountCents: 0,
          },
        });
        return NextResponse.json(result);
      }
    }

    // 4. If PhonePe redirect return
    if (gateway === "phonepe" || ppTxnId) {
      const txnId = ppTxnId || sessionId;
      if (txnId) {
        const result = await paymentService.verifyAndCompletePayment({
          gatewayId: "phonepe",
          verifyInput: {
            orderId: txnId,
            gatewayPaymentId: txnId,
            gatewayOrderId: txnId,
            amountCents: 0,
          },
        });
        return NextResponse.json(result);
      }
    }

    // 5. If PayPal redirect return
    if (gateway === "paypal" || token) {
      const orderId = token || sessionId;
      if (orderId) {
        const result = await paymentService.verifyAndCompletePayment({
          gatewayId: "paypal",
          verifyInput: {
            orderId,
            gatewayPaymentId: orderId,
            gatewayOrderId: orderId,
            amountCents: 0,
          },
        });
        return NextResponse.json(result);
      }
    }

    // 6. If PayU redirect return
    if (gateway === "payu" || txnid) {
      const orderId = txnid || sessionId;
      if (orderId) {
        const result = await paymentService.verifyAndCompletePayment({
          gatewayId: "payu",
          verifyInput: {
            orderId,
            gatewayPaymentId: orderId,
            gatewayOrderId: orderId,
            amountCents: 0,
          },
        });
        return NextResponse.json(result);
      }
    }

    // 7. If CCAvenue redirect return
    if (gateway === "ccavenue" || encResp) {
      const orderId = sessionId || searchParams.get("order_id");
      if (orderId || encResp) {
        const result = await paymentService.verifyAndCompletePayment({
          gatewayId: "ccavenue",
          verifyInput: {
            orderId: orderId || "CCAV_RETURN",
            gatewayPaymentId: orderId || "CCAV_RETURN",
            gatewaySignature: encResp || undefined,
            amountCents: 0,
            rawPayload: { encResp },
          },
        });
        return NextResponse.json(result);
      }
    }

    // 8. If an application order ID was passed, verify from database order
    if (sessionId && sessionId.startsWith("ORD-")) {
      const order = await db.query.orders.findFirst({
        where: eq(orders.orderId, sessionId),
      });
      if (order) {
        const result = await paymentService.verifyAndCompletePayment({
          gatewayId: order.gateway as PaymentGatewayId,
          verifyInput: {
            orderId: order.orderId,
            gatewayPaymentId: order.gatewayOrderId || order.orderId,
            gatewayOrderId: order.gatewayOrderId || undefined,
            amountCents: order.totalAmountCents,
          },
        });
        return NextResponse.json(result);
      }
    }

    return NextResponse.json(
      { error: "Unverified transaction. Real payment gateway confirmation is required before tickets can be issued." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Confirm checkout error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
