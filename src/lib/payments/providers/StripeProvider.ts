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
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

export class StripeProvider implements IPaymentProvider {
  readonly id: PaymentGatewayId = "stripe";
  readonly name = "Stripe Checkout";
  readonly isSandbox: boolean;

  constructor() {
    const key = process.env.STRIPE_SECRET_KEY || "";
    this.isSandbox = key.startsWith("sk_test_");
  }

  getUIInfo(): GatewayUIInfo {
    return {
      id: this.id,
      name: "Stripe Checkout (Cards & Apple Pay)",
      category: "card",
      tagline: "Official Hosted Stripe Checkout with 3D-Secure 2.0",
      badge: "Official SDK",
      popular: true,
      isSandbox: this.isSandbox,
      supportedCurrencies: ["USD", "INR", "EUR", "GBP"],
    };
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult> {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error(
        "STRIPE_SECRET_KEY is not configured in environment variables. Please provide active Stripe credentials to initiate real payments."
      );
    }

    try {
      // In Stripe test accounts where USD is default, specify USD or account currency
      const currencyCode = "usd";
      const unitAmount = Math.max(50, Math.round(input.amountCents)); // Minimum 50 cents

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: currencyCode,
              product_data: {
                name: input.description,
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        customer_email: input.customer.email,
        success_url: `${input.returnUrl}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: input.cancelUrl,
        metadata: {
          orderId: input.orderId,
          userId: input.customer.userId?.toString() || "",
          eventId: input.metadata?.eventId?.toString() || "",
          ...(input.metadata || {}),
        },
      });

      if (!session.url) {
        throw new Error("Stripe did not return a valid hosted checkout URL");
      }

      return {
        orderId: input.orderId,
        gatewayOrderId: session.id,
        gateway: this.id,
        amountCents: input.amountCents,
        currency: currencyCode.toUpperCase(),
        status: "created",
        checkoutUrl: session.url,
        clientSecret: session.id,
        gatewayPayload: {
          sessionId: session.id,
          url: session.url,
        },
      };
    } catch (err) {
      console.error("Real Stripe checkout session creation failed:", err);
      throw new Error(
        err instanceof Error ? err.message : "Failed to create official Stripe Checkout session"
      );
    }
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is required to verify real Stripe transactions.");
    }

    if (!input.gatewayPaymentId) {
      throw new Error("Missing Stripe Checkout session ID for verification.");
    }

    try {
      const session = await stripe.checkout.sessions.retrieve(input.gatewayPaymentId);

      if (session.payment_status !== "paid") {
        return {
          success: false,
          transactionId: session.id,
          status: "failed",
          amountCents: session.amount_total || input.amountCents,
          currency: (session.currency || "USD").toUpperCase(),
          gateway: this.id,
          errorMessage: `Stripe payment incomplete: status is "${session.payment_status}"`,
        };
      }

      return {
        success: true,
        transactionId: (session.payment_intent as string) || session.id,
        status: "succeeded",
        amountCents: session.amount_total || input.amountCents,
        currency: (session.currency || "USD").toUpperCase(),
        gateway: this.id,
        paymentMethodDetails: {
          method: "stripe_card",
          brand: "Stripe Verified 3D-Secure",
        },
      };
    } catch (err) {
      console.error("Stripe verification call failed on official API:", err);
      throw new Error(
        err instanceof Error ? err.message : "Failed to retrieve and verify session from Stripe"
      );
    }
  }

  async refund(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY required to process real refunds.");
    }

    try {
      const refund = await stripe.refunds.create({
        payment_intent: input.transactionId,
        amount: input.amountCents,
        reason: "requested_by_customer",
      });

      return {
        success: refund.status === "succeeded" || refund.status === "pending",
        refundId: refund.id,
        amountCents: refund.amount,
        status: refund.status === "succeeded" ? "succeeded" : "pending",
      };
    } catch (err) {
      console.error("Stripe refund failed:", err);
      return {
        success: false,
        refundId: "",
        amountCents: input.amountCents,
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Stripe refund failed",
      };
    }
  }

  async verifyWebhook(input: WebhookVerificationInput): Promise<WebhookEventResult> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      return { isValid: false, eventType: "unknown", error: "Missing STRIPE_WEBHOOK_SECRET" };
    }

    const sig = (input.headers["stripe-signature"] as string) || "";
    try {
      const event = stripe.webhooks.constructEvent(input.rawBody, sig, secret);
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        return {
          isValid: true,
          eventType: "payment.succeeded",
          orderId: session.metadata?.orderId,
          transactionId: (session.payment_intent as string) || session.id,
          amountCents: session.amount_total || 0,
          metadata: session.metadata || {},
        };
      }

      return {
        isValid: true,
        eventType: "unknown",
      };
    } catch (err) {
      return {
        isValid: false,
        eventType: "unknown",
        error: err instanceof Error ? err.message : "Invalid Stripe signature",
      };
    }
  }
}
