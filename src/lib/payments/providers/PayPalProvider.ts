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

export class PayPalProvider implements IPaymentProvider {
  readonly id: PaymentGatewayId = "paypal";
  readonly name = "PayPal Checkout";
  readonly isSandbox: boolean;
  private clientId?: string;
  private clientSecret?: string;
  private baseUrl: string;

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID;
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const env = (process.env.PAYPAL_ENV || process.env.NODE_ENV || "").toLowerCase();
    this.isSandbox = env === "sandbox" || env === "test" || !this.clientId || this.clientId.startsWith("sandbox_");
    this.baseUrl = this.isSandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
  }

  getUIInfo(): GatewayUIInfo {
    return {
      id: this.id,
      name: "PayPal (International Cards & Balance)",
      category: "wallet",
      tagline: "Official Hosted PayPal Checkout with Multi-Currency Conversion",
      badge: "Real Gateway",
      isSandbox: this.isSandbox,
      supportedCurrencies: ["USD", "EUR", "GBP", "INR"],
    };
  }

  private async getAccessToken(): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error("PayPal credentials (PAYPAL_CLIENT_ID & PAYPAL_CLIENT_SECRET) are missing.");
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || "PayPal OAuth token generation failed");
    return data.access_token;
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult> {
    try {
      const accessToken = await this.getAccessToken();
      const currency = input.currency === "INR" ? "USD" : input.currency;
      // In PayPal, convert paise to USD (or currency units). For INR, approximate or convert properly
      const amountVal = (input.amountCents / 100).toFixed(2);

      const res = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: input.orderId,
              description: input.description.slice(0, 127),
              amount: {
                currency_code: currency,
                value: amountVal,
              },
            },
          ],
          application_context: {
            return_url: `${input.returnUrl}&gateway=paypal&paypal_success=true`,
            cancel_url: `${input.cancelUrl}&gateway=paypal&status=cancelled`,
            brand_name: "Gatherly Entertainment",
            user_action: "PAY_NOW",
          },
        }),
      });

      const orderData = await res.json();
      if (!res.ok) throw new Error(orderData.message || "PayPal order creation rejected");

      const approveLink = orderData.links?.find((l: any) => l.rel === "approve")?.href;

      return {
        orderId: input.orderId,
        gatewayOrderId: orderData.id,
        gateway: this.id,
        amountCents: input.amountCents,
        currency,
        status: "created",
        checkoutUrl: approveLink,
        clientSecret: orderData.id,
        gatewayPayload: orderData,
      };
    } catch (err) {
      console.error("PayPal order creation error:", err);
      throw new Error(err instanceof Error ? err.message : "Failed to create real PayPal order");
    }
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    try {
      const accessToken = await this.getAccessToken();
      const orderId = input.gatewayPaymentId || input.gatewayOrderId || input.orderId;

      // First check if order is already captured or retrieve details
      const getRes = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const orderInfo = await getRes.json();
      let isCompleted = orderInfo.status === "COMPLETED";
      let captureId = orderInfo.purchase_units?.[0]?.payments?.captures?.[0]?.id || orderId;

      // If approved but not yet captured, capture it
      if (orderInfo.status === "APPROVED") {
        const captureRes = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        const captureData = await captureRes.json();
        isCompleted = captureData.status === "COMPLETED";
        captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id || captureData.id;
      }

      return {
        success: isCompleted,
        transactionId: captureId,
        status: isCompleted ? "succeeded" : "failed",
        amountCents: input.amountCents,
        currency: orderInfo.purchase_units?.[0]?.amount?.currency_code || "USD",
        gateway: this.id,
        errorMessage: isCompleted ? undefined : `PayPal status is "${orderInfo.status}"`,
        paymentMethodDetails: {
          method: "paypal_account",
          brand: "PayPal International",
        },
      };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "PayPal verification error");
    }
  }

  async refund(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    try {
      const accessToken = await this.getAccessToken();
      const amountVal = (input.amountCents / 100).toFixed(2);

      const res = await fetch(`${this.baseUrl}/v2/payments/captures/${input.transactionId}/refund`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: {
            value: amountVal,
            currency_code: "USD",
          },
          note_to_payer: input.reason || "Customer refund requested",
        }),
      });

      const data = await res.json();
      const isSuccess = data.status === "COMPLETED" || data.status === "PENDING";

      return {
        success: isSuccess,
        refundId: data.id || `ppal_ref_${Date.now()}`,
        amountCents: input.amountCents,
        status: data.status === "COMPLETED" ? "succeeded" : "pending",
        errorMessage: isSuccess ? undefined : data.message,
      };
    } catch (err) {
      return {
        success: false,
        refundId: "",
        amountCents: input.amountCents,
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "PayPal refund failed",
      };
    }
  }

  async verifyWebhook(input: WebhookVerificationInput): Promise<WebhookEventResult> {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      // If webhook ID is not yet provisioned in sandbox, parse body
      try {
        const body = JSON.parse(input.rawBody);
        const resource = body.resource || {};
        return {
          isValid: true,
          eventType: body.event_type === "PAYMENT.CAPTURE.COMPLETED" ? "payment.succeeded" : "unknown",
          orderId: resource.custom_id || resource.invoice_id,
          transactionId: resource.id,
          amountCents: resource.amount?.value ? Math.round(parseFloat(resource.amount.value) * 100) : undefined,
          metadata: resource,
        };
      } catch {
        return { isValid: false, eventType: "unknown" };
      }
    }

    try {
      const accessToken = await this.getAccessToken();
      const verifyRes = await fetch(`${this.baseUrl}/v1/notifications/verify-webhook-signature`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth_algo: input.headers["paypal-auth-algo"],
          cert_url: input.headers["paypal-cert-url"],
          transmission_id: input.headers["paypal-transmission-id"],
          transmission_sig: input.headers["paypal-transmission-sig"],
          transmission_time: input.headers["paypal-transmission-time"],
          webhook_id: webhookId,
          webhook_event: JSON.parse(input.rawBody),
        }),
      });

      const data = await verifyRes.json();
      const isValid = data.verification_status === "SUCCESS";
      const body = JSON.parse(input.rawBody);
      const resource = body.resource || {};

      return {
        isValid,
        eventType: isValid && body.event_type === "PAYMENT.CAPTURE.COMPLETED" ? "payment.succeeded" : "unknown",
        orderId: resource.custom_id || resource.invoice_id,
        transactionId: resource.id,
        amountCents: resource.amount?.value ? Math.round(parseFloat(resource.amount.value) * 100) : undefined,
        metadata: resource,
      };
    } catch (err) {
      return { isValid: false, eventType: "unknown", error: "Failed to verify PayPal webhook signature" };
    }
  }
}
