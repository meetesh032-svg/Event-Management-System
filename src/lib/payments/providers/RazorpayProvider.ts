import {
  IPaymentProvider,
  PaymentGatewayId,
  CreatePaymentOrderInput,
  PaymentOrderResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
  RefundPaymentInput,
  RefundPaymentResult,
  WebhookVerificationInput,
  WebhookEventResult,
  GatewayUIInfo,
} from "../types";
import crypto from "crypto";

export class RazorpayProvider implements IPaymentProvider {
  readonly id: PaymentGatewayId = "razorpay";
  readonly name = "Razorpay Checkout";
  readonly isSandbox: boolean;
  private keyId?: string;
  private keySecret?: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID;
    this.keySecret = process.env.RAZORPAY_KEY_SECRET;
    this.isSandbox = !this.keyId || this.keyId.startsWith("rzp_test_");
  }

  getUIInfo(): GatewayUIInfo {
    return {
      id: this.id,
      name: "Razorpay (UPI, Google Pay, Cards, NetBanking)",
      category: "upi",
      tagline: "Official Razorpay Standard Checkout (GPay, PhonePe, Cards)",
      badge: "Real Gateway",
      popular: true,
      isSandbox: this.isSandbox,
      supportedCurrencies: ["INR"],
    };
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult> {
    if (!this.keyId || !this.keySecret) {
      throw new Error(
        "Razorpay credentials (RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET) are not configured in environment variables. Real transactions require active Razorpay gateway keys."
      );
    }

    try {
      // Call official Razorpay Orders API
      const authHeader = `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64")}`;
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(input.amountCents),
          currency: "INR",
          receipt: input.orderId,
          notes: {
            orderId: input.orderId,
            description: input.description,
            customerEmail: input.customer.email,
          },
        }),
      });

      const orderData = await res.json();
      if (!res.ok) {
        throw new Error(orderData.error?.description || "Razorpay order creation failed");
      }

      return {
        orderId: input.orderId,
        gatewayOrderId: orderData.id,
        gateway: this.id,
        amountCents: input.amountCents,
        currency: "INR",
        status: "created",
        clientSecret: this.keyId,
        gatewayPayload: {
          key: this.keyId,
          orderId: orderData.id,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "Gatherly Entertainment",
          description: input.description,
          prefill: {
            name: input.customer.name,
            email: input.customer.email,
            contact: input.customer.phone || "",
          },
          theme: {
            color: "#F84464",
          },
        },
      };
    } catch (err) {
      console.error("Razorpay order creation failed on official endpoint:", err);
      throw new Error(err instanceof Error ? err.message : "Failed to create real Razorpay order");
    }
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    if (!this.keySecret) {
      throw new Error("RAZORPAY_KEY_SECRET is required to verify real signatures.");
    }

    const { gatewayPaymentId, gatewayOrderId, gatewaySignature } = input;

    if (!gatewayOrderId || !gatewayPaymentId || !gatewaySignature) {
      throw new Error("Missing Razorpay payment verification parameters (order_id, payment_id, or signature).");
    }

    // Verify HMAC-SHA256 signature
    const generated = crypto
      .createHmac("sha256", this.keySecret)
      .update(`${gatewayOrderId}|${gatewayPaymentId}`)
      .digest("hex");

    if (generated !== gatewaySignature) {
      return {
        success: false,
        transactionId: gatewayPaymentId,
        status: "failed",
        amountCents: input.amountCents,
        currency: "INR",
        gateway: this.id,
        errorMessage: "Signature verification failed: payment authorization may have been tampered with.",
      };
    }

    return {
      success: true,
      transactionId: gatewayPaymentId,
      status: "succeeded",
      amountCents: input.amountCents,
      currency: "INR",
      gateway: this.id,
      paymentMethodDetails: {
        method: "razorpay_checkout",
      },
    };
  }

  async refund(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    if (!this.keyId || !this.keySecret) {
      throw new Error("Razorpay credentials required for refunds.");
    }

    try {
      const authHeader = `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64")}`;
      const res = await fetch(`https://api.razorpay.com/v1/payments/${input.transactionId}/refund`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(input.amountCents),
          notes: { reason: input.reason },
        }),
      });

      const refundData = await res.json();
      if (!res.ok) {
        throw new Error(refundData.error?.description || "Razorpay refund failed");
      }

      return {
        success: true,
        refundId: refundData.id,
        amountCents: input.amountCents,
        status: "succeeded",
      };
    } catch (err) {
      return {
        success: false,
        refundId: "",
        amountCents: input.amountCents,
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Razorpay refund failed",
      };
    }
  }

  async verifyWebhook(input: WebhookVerificationInput): Promise<WebhookEventResult> {
    const sig = (input.headers["x-razorpay-signature"] as string) || "";
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || this.keySecret;

    if (sig && webhookSecret) {
      const expected = crypto.createHmac("sha256", webhookSecret).update(input.rawBody).digest("hex");
      if (expected !== sig) {
        return { isValid: false, eventType: "unknown", error: "Bad webhook signature" };
      }
    }

    try {
      const parsed = JSON.parse(input.rawBody);
      const payment = parsed.payload?.payment?.entity;
      return {
        isValid: true,
        eventType: parsed.event === "payment.captured" ? "payment.succeeded" : "unknown",
        orderId: payment?.notes?.orderId,
        transactionId: payment?.id,
        amountCents: payment?.amount,
        metadata: payment?.notes || {},
      };
    } catch (err) {
      return { isValid: false, eventType: "unknown", error: "Invalid JSON body" };
    }
  }
}
