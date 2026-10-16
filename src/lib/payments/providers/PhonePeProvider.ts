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

export class PhonePeProvider implements IPaymentProvider {
  readonly id: PaymentGatewayId = "phonepe";
  readonly name = "PhonePe Payment Gateway";
  readonly isSandbox: boolean;
  private merchantId?: string;
  private saltKey?: string;
  private saltIndex: string;
  private baseUrl: string;

  constructor() {
    this.merchantId = process.env.PHONEPE_MERCHANT_ID;
    this.saltKey = process.env.PHONEPE_SALT_KEY;
    this.saltIndex = process.env.PHONEPE_SALT_INDEX || "1";
    const env = (process.env.PHONEPE_ENV || process.env.NODE_ENV || "").toLowerCase();
    this.isSandbox =
      env === "sandbox" ||
      env === "test" ||
      !this.merchantId ||
      this.merchantId.includes("TEST") ||
      this.merchantId.includes("UAT");
    this.baseUrl = this.isSandbox
      ? "https://api-preprod.phonepe.com/apis/pg-sandbox"
      : "https://api.phonepe.com/apis/hermes";
  }

  getUIInfo(): GatewayUIInfo {
    return {
      id: this.id,
      name: "PhonePe (UPI, PhonePe Wallet, QR, Cards)",
      category: "upi",
      tagline: "India's #1 UPI PG with Direct App Seamless Intent",
      badge: "Real Gateway",
      popular: true,
      isSandbox: this.isSandbox,
      supportedCurrencies: ["INR"],
    };
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult> {
    if (!this.merchantId || !this.saltKey) {
      throw new Error(
        "PhonePe credentials (PHONEPE_MERCHANT_ID & PHONEPE_SALT_KEY) are required in environment variables."
      );
    }

    const transactionId = `PP_${input.orderId.replace(/[^a-zA-Z0-9]/g, "")}_${Date.now().toString().slice(-4)}`;
    const callbackUrl = `${input.returnUrl.split("/bookings")[0]}/api/payments/webhook/phonepe`;

    const payloadObj = {
      merchantId: this.merchantId,
      merchantTransactionId: transactionId,
      merchantUserId: `USER_${input.customer.userId || Date.now()}`,
      amount: Math.round(input.amountCents),
      redirectUrl: `${input.returnUrl}&gateway=phonepe&transactionId=${transactionId}`,
      redirectMode: "REDIRECT",
      callbackUrl,
      mobileNumber: input.customer.phone || "9999999999",
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    const base64Payload = Buffer.from(JSON.stringify(payloadObj)).toString("base64");
    const stringToHash = `${base64Payload}/pg/v1/pay${this.saltKey}`;
    const sha256Hash = crypto.createHash("sha256").update(stringToHash).digest("hex");
    const xVerify = `${sha256Hash}###${this.saltIndex}`;

    try {
      const res = await fetch(`${this.baseUrl}/pg/v1/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerify,
        },
        body: JSON.stringify({ request: base64Payload }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "PhonePe API rejected order initialization");
      }

      const redirectUrl = data.data?.instrumentResponse?.redirectInfo?.url;

      return {
        orderId: input.orderId,
        gatewayOrderId: transactionId,
        gateway: this.id,
        amountCents: input.amountCents,
        currency: "INR",
        status: "created",
        checkoutUrl: redirectUrl,
        clientSecret: xVerify,
        gatewayPayload: data,
      };
    } catch (err) {
      console.error("PhonePe order creation error:", err);
      throw new Error(err instanceof Error ? err.message : "Failed to initiate real PhonePe payment");
    }
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    if (!this.merchantId || !this.saltKey) {
      throw new Error("PhonePe credentials required to verify transactions.");
    }

    const transactionId = input.gatewayPaymentId || input.gatewayOrderId || input.orderId;
    const stringToHash = `/pg/v1/status/${this.merchantId}/${transactionId}${this.saltKey}`;
    const sha256Hash = crypto.createHash("sha256").update(stringToHash).digest("hex");
    const xVerify = `${sha256Hash}###${this.saltIndex}`;

    try {
      const res = await fetch(`${this.baseUrl}/pg/v1/status/${this.merchantId}/${transactionId}`, {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerify,
          "X-MERCHANT-ID": this.merchantId,
        },
      });

      const statusData = await res.json();
      const isPaid = statusData.code === "PAYMENT_SUCCESS";

      return {
        success: isPaid,
        transactionId: statusData.data?.transactionId || transactionId,
        status: isPaid ? "succeeded" : "failed",
        amountCents: statusData.data?.amount || input.amountCents,
        currency: "INR",
        gateway: this.id,
        errorMessage: isPaid ? undefined : `PhonePe payment status: ${statusData.code} (${statusData.message || ""})`,
        paymentMethodDetails: {
          method: statusData.data?.paymentInstrument?.type || "phonepe_upi",
          upiId: statusData.data?.paymentInstrument?.utr,
          brand: statusData.data?.paymentInstrument?.cardType,
        },
      };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "PhonePe verification error");
    }
  }

  async refund(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    if (!this.merchantId || !this.saltKey) {
      throw new Error("PhonePe credentials required for refunds.");
    }

    try {
      const refundTxnId = `REF_${input.transactionId}_${Date.now().toString().slice(-4)}`;
      const payloadObj = {
        merchantId: this.merchantId,
        merchantTransactionId: refundTxnId,
        originalTransactionId: input.transactionId,
        amount: Math.round(input.amountCents),
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/payments/webhook/phonepe`,
      };

      const base64Payload = Buffer.from(JSON.stringify(payloadObj)).toString("base64");
      const stringToHash = `${base64Payload}/pg/v1/refund${this.saltKey}`;
      const sha256Hash = crypto.createHash("sha256").update(stringToHash).digest("hex");
      const xVerify = `${sha256Hash}###${this.saltIndex}`;

      const res = await fetch(`${this.baseUrl}/pg/v1/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerify,
        },
        body: JSON.stringify({ request: base64Payload }),
      });

      const data = await res.json();
      const isSuccess = data.success && (data.code === "PAYMENT_SUCCESS" || data.code === "PAYMENT_PENDING");

      return {
        success: isSuccess,
        refundId: data.data?.transactionId || refundTxnId,
        amountCents: input.amountCents,
        status: data.code === "PAYMENT_SUCCESS" ? "succeeded" : "pending",
        errorMessage: isSuccess ? undefined : data.message || data.code,
      };
    } catch (err) {
      return {
        success: false,
        refundId: "",
        amountCents: input.amountCents,
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "PhonePe refund failed",
      };
    }
  }

  async verifyWebhook(input: WebhookVerificationInput): Promise<WebhookEventResult> {
    const xVerify = (input.headers["x-verify"] as string) || "";
    if (!xVerify || !this.saltKey) {
      return { isValid: false, eventType: "unknown", error: "Missing PhonePe webhook signature or salt key" };
    }

    try {
      const stringToHash = `${input.rawBody}${this.saltKey}`;
      const expectedHash = crypto.createHash("sha256").update(stringToHash).digest("hex");
      const expectedVerify = `${expectedHash}###${this.saltIndex}`;

      if (xVerify !== expectedVerify) {
        return { isValid: false, eventType: "unknown", error: "Bad PhonePe webhook signature" };
      }

      const parsed = JSON.parse(input.rawBody);
      const decodedResponse = Buffer.from(parsed.response, "base64").toString("utf-8");
      const resObj = JSON.parse(decodedResponse);

      const isSuccess = resObj.code === "PAYMENT_SUCCESS";

      return {
        isValid: true,
        eventType: isSuccess ? "payment.succeeded" : "payment.failed",
        orderId: resObj.data?.merchantTransactionId,
        transactionId: resObj.data?.transactionId,
        amountCents: resObj.data?.amount,
        metadata: resObj.data,
      };
    } catch (err) {
      return { isValid: false, eventType: "unknown", error: "Failed to decode PhonePe webhook" };
    }
  }
}
