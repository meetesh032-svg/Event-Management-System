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

export class CashfreeProvider implements IPaymentProvider {
  readonly id: PaymentGatewayId = "cashfree";
  readonly name = "Cashfree Payments";
  readonly isSandbox: boolean;
  private appId?: string;
  private secretKey?: string;
  private baseUrl: string;

  constructor() {
    this.appId = process.env.CASHFREE_APP_ID;
    this.secretKey = process.env.CASHFREE_SECRET_KEY;
    const env = (process.env.CASHFREE_ENV || process.env.NODE_ENV || "").toLowerCase();
    this.isSandbox = env === "sandbox" || env === "test" || !this.appId || this.appId.startsWith("TEST");
    this.baseUrl = this.isSandbox ? "https://sandbox.cashfree.com/pg" : "https://api.cashfree.com/pg";
  }

  getUIInfo(): GatewayUIInfo {
    return {
      id: this.id,
      name: "Cashfree (Instant UPI QR, Cards, NetBanking)",
      category: "upi",
      tagline: "Official Cashfree Hosted PG with Instant Dynamic UPI QR",
      badge: "Real Gateway",
      isSandbox: this.isSandbox,
      supportedCurrencies: ["INR"],
    };
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult> {
    if (!this.appId || !this.secretKey) {
      throw new Error(
        "Cashfree credentials (CASHFREE_APP_ID & CASHFREE_SECRET_KEY) are required in environment variables."
      );
    }

    try {
      const res = await fetch(`${this.baseUrl}/orders`, {
        method: "POST",
        headers: {
          "x-client-id": this.appId,
          "x-client-secret": this.secretKey,
          "x-api-version": "2023-08-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: input.orderId,
          order_amount: parseFloat((input.amountCents / 100).toFixed(2)),
          order_currency: "INR",
          customer_details: {
            customer_id: `cust_${input.customer.userId || Date.now()}`,
            customer_email: input.customer.email,
            customer_phone: input.customer.phone || "9999999999",
            customer_name: input.customer.name,
          },
          order_meta: {
            return_url: `${input.returnUrl}&cf_order_id={order_id}&gateway=cashfree`,
            notify_url: `${input.returnUrl.split("/bookings")[0]}/api/payments/webhook/cashfree`,
          },
          order_note: input.description,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error_details || "Cashfree order creation rejected");
      }

      const checkoutUrl = data.payment_link || (this.isSandbox
        ? `https://sandbox.cashfree.com/pg/checkout?session_id=${data.payment_session_id}`
        : `https://api.cashfree.com/pg/checkout?session_id=${data.payment_session_id}`);

      return {
        orderId: input.orderId,
        gatewayOrderId: data.order_id,
        gateway: this.id,
        amountCents: input.amountCents,
        currency: "INR",
        status: "created",
        clientSecret: data.payment_session_id,
        checkoutUrl,
        gatewayPayload: data,
      };
    } catch (err) {
      console.error("Cashfree order creation error:", err);
      throw new Error(err instanceof Error ? err.message : "Failed to create Cashfree order");
    }
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    if (!this.appId || !this.secretKey) {
      throw new Error("Cashfree credentials required to verify transactions.");
    }

    const orderId = input.gatewayOrderId || input.orderId;

    try {
      const res = await fetch(`${this.baseUrl}/orders/${orderId}`, {
        headers: {
          "x-client-id": this.appId,
          "x-client-secret": this.secretKey,
          "x-api-version": "2023-08-01",
        },
      });

      const orderData = await res.json();
      if (!res.ok) {
        throw new Error(orderData.message || "Failed to retrieve order from Cashfree");
      }

      const isPaid = orderData.order_status === "PAID";

      // Also fetch payments list to extract official payment id & method details
      let paymentDetails: any = null;
      let transactionId = orderData.cf_order_id?.toString() || input.gatewayPaymentId;

      try {
        const payRes = await fetch(`${this.baseUrl}/orders/${orderId}/payments`, {
          headers: {
            "x-client-id": this.appId,
            "x-client-secret": this.secretKey,
            "x-api-version": "2023-08-01",
          },
        });
        if (payRes.ok) {
          const payList = await payRes.json();
          if (Array.isArray(payList) && payList.length > 0) {
            const successfulPay = payList.find((p: any) => p.payment_status === "SUCCESS") || payList[0];
            if (successfulPay) {
              transactionId = successfulPay.cf_payment_id?.toString() || transactionId;
              paymentDetails = successfulPay;
            }
          }
        }
      } catch (e) {
        // Fallback to orderData
      }

      return {
        success: isPaid,
        transactionId,
        status: isPaid ? "succeeded" : "failed",
        amountCents: Math.round(parseFloat(orderData.order_amount) * 100),
        currency: "INR",
        gateway: this.id,
        errorMessage: isPaid ? undefined : `Cashfree order status: ${orderData.order_status}`,
        paymentMethodDetails: {
          method: paymentDetails?.payment_group || "cashfree_pg",
          brand: paymentDetails?.payment_method?.card?.card_network,
          upiId: paymentDetails?.payment_method?.upi?.upi_id,
          bankName: paymentDetails?.payment_method?.netbanking?.netbanking_bank_name,
        },
      };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Cashfree verification error");
    }
  }

  async refund(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    if (!this.appId || !this.secretKey) {
      throw new Error("Cashfree credentials required for refunds.");
    }

    try {
      const refundId = `cf_ref_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
      const amount = parseFloat((input.amountCents / 100).toFixed(2));

      const res = await fetch(`${this.baseUrl}/orders/${input.transactionId}/refunds`, {
        method: "POST",
        headers: {
          "x-client-id": this.appId,
          "x-client-secret": this.secretKey,
          "x-api-version": "2023-08-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refund_id: refundId,
          refund_amount: amount,
          refund_note: input.reason || "Customer cancellation requested",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Cashfree refund rejected by gateway");
      }

      const isSuccess = data.refund_status === "SUCCESS" || data.refund_status === "PENDING";

      return {
        success: isSuccess,
        refundId: data.cf_refund_id?.toString() || refundId,
        amountCents: input.amountCents,
        status: data.refund_status === "SUCCESS" ? "succeeded" : "pending",
        errorMessage: isSuccess ? undefined : data.refund_status,
      };
    } catch (err) {
      return {
        success: false,
        refundId: "",
        amountCents: input.amountCents,
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Cashfree refund failed",
      };
    }
  }

  async verifyWebhook(input: WebhookVerificationInput): Promise<WebhookEventResult> {
    const signature = (input.headers["x-webhook-signature"] as string) || "";
    const timestamp = (input.headers["x-webhook-timestamp"] as string) || "";

    if (!signature || !this.secretKey) {
      return { isValid: false, eventType: "unknown", error: "Missing signature or secret key" };
    }

    try {
      const signaturePayload = `${timestamp}${input.rawBody}`;
      const expected = crypto
        .createHmac("sha256", this.secretKey)
        .update(signaturePayload)
        .digest("base64");

      if (expected !== signature) {
        return { isValid: false, eventType: "unknown", error: "Bad Cashfree webhook signature" };
      }

      const parsed = JSON.parse(input.rawBody);
      const data = parsed.data || {};
      const order = data.order || {};
      const payment = data.payment || {};

      let eventType: WebhookEventResult["eventType"] = "unknown";
      if (parsed.type === "PAYMENT_SUCCESS_WEBHOOK") eventType = "payment.succeeded";
      else if (parsed.type === "PAYMENT_FAILED_WEBHOOK") eventType = "payment.failed";
      else if (parsed.type === "REFUND_STATUS_WEBHOOK") eventType = "refund.succeeded";

      return {
        isValid: true,
        eventType,
        orderId: order.order_id,
        transactionId: payment.cf_payment_id?.toString() || order.cf_order_id?.toString(),
        amountCents: payment.payment_amount ? Math.round(payment.payment_amount * 100) : undefined,
        metadata: data,
      };
    } catch (err) {
      return { isValid: false, eventType: "unknown", error: "Failed to parse Cashfree webhook" };
    }
  }
}
