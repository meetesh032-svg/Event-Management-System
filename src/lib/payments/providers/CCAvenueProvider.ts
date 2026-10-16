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
import { encryptCCAvenue, decryptCCAvenue } from "../crypto-utils";

export class CCAvenueProvider implements IPaymentProvider {
  readonly id: PaymentGatewayId = "ccavenue";
  readonly name = "CCAvenue PG";
  readonly isSandbox: boolean;
  private merchantId?: string;
  private accessCode?: string;
  private workingKey?: string;
  private baseUrl: string;

  constructor() {
    this.merchantId = process.env.CCAVENUE_MERCHANT_ID;
    this.accessCode = process.env.CCAVENUE_ACCESS_CODE || process.env.CCAVENUE_KEY;
    this.workingKey = process.env.CCAVENUE_WORKING_KEY || process.env.CCAVENUE_SALT;
    const env = (process.env.CCAVENUE_ENV || process.env.NODE_ENV || "").toLowerCase();
    this.isSandbox = env === "sandbox" || env === "test" || !this.merchantId || this.merchantId.includes("TEST");
    this.baseUrl = this.isSandbox
      ? "https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction"
      : "https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction";
  }

  getUIInfo(): GatewayUIInfo {
    return {
      id: this.id,
      name: "CCAvenue (55+ NetBanking & Corporate Cards)",
      category: "netbanking",
      tagline: "India's Pioneer Payment Gateway (SBI, HDFC, ICICI, Axis)",
      badge: "Real Gateway",
      isSandbox: this.isSandbox,
      supportedCurrencies: ["INR"],
    };
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult> {
    if (!this.merchantId || !this.workingKey || !this.accessCode) {
      throw new Error(
        "CCAvenue credentials (CCAVENUE_MERCHANT_ID, CCAVENUE_ACCESS_CODE, CCAVENUE_WORKING_KEY) are required in environment variables."
      );
    }

    const ccavOrderId = `CCAV_${input.orderId.replace(/[^a-zA-Z0-9]/g, "")}_${Date.now().toString().slice(-4)}`;
    const amountStr = (input.amountCents / 100).toFixed(2);

    const queryParams = new URLSearchParams({
      merchant_id: this.merchantId,
      order_id: ccavOrderId,
      currency: "INR",
      amount: amountStr,
      redirect_url: `${input.returnUrl}&gateway=ccavenue`,
      cancel_url: `${input.cancelUrl}&gateway=ccavenue&status=cancelled`,
      language: "EN",
      billing_name: input.customer.name,
      billing_email: input.customer.email,
      billing_tel: input.customer.phone || "9999999999",
      merchant_param1: input.orderId,
      merchant_param2: input.customer.userId?.toString() || "",
    });

    const encRequest = encryptCCAvenue(queryParams.toString(), this.workingKey);
    const checkoutUrl = `${this.baseUrl}&encRequest=${encRequest}&access_code=${this.accessCode}`;

    return {
      orderId: input.orderId,
      gatewayOrderId: ccavOrderId,
      gateway: this.id,
      amountCents: input.amountCents,
      currency: "INR",
      status: "created",
      clientSecret: encRequest,
      checkoutUrl,
      gatewayPayload: {
        actionUrl: this.baseUrl,
        encRequest,
        access_code: this.accessCode,
      },
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    if (!this.workingKey) {
      throw new Error("CCAvenue working key required for response decryption and verification.");
    }

    const { rawPayload, gatewayPaymentId, gatewayOrderId, orderId } = input;
    let encResp = rawPayload?.encResp || input.gatewaySignature;

    if (!encResp && rawPayload) {
      // In form post, could be in body
      encResp = typeof rawPayload === "string" ? rawPayload : rawPayload.encResp;
    }

    // If encrypted response returned from CCAvenue redirect
    if (encResp) {
      try {
        const decrypted = decryptCCAvenue(encResp, this.workingKey);
        const params = new URLSearchParams(decrypted);
        const orderStatus = params.get("order_status");
        const trackingId = params.get("tracking_id");
        const bankRefNo = params.get("bank_ref_no");
        const respAmount = params.get("amount");
        const failureMessage = params.get("failure_message") || params.get("status_message");

        const isSuccess = orderStatus?.toLowerCase() === "success";

        if (!isSuccess) {
          return {
            success: false,
            transactionId: trackingId || gatewayPaymentId || orderId,
            status: "failed",
            amountCents: input.amountCents,
            currency: "INR",
            gateway: this.id,
            errorMessage: `CCAvenue status: ${orderStatus} (${failureMessage || "Transaction declined"})`,
          };
        }

        const amountCents = respAmount ? Math.round(parseFloat(respAmount) * 100) : input.amountCents;

        return {
          success: true,
          transactionId: trackingId || gatewayPaymentId || `CCAV_${Date.now()}`,
          status: "succeeded",
          amountCents,
          currency: "INR",
          gateway: this.id,
          paymentMethodDetails: {
            method: params.get("payment_mode") || "ccavenue_netbanking",
            brand: params.get("card_name") || undefined,
            bankName: bankRefNo || undefined,
          },
        };
      } catch (err) {
        console.error("CCAvenue decryption error:", err);
        throw new Error(err instanceof Error ? err.message : "Failed to decrypt CCAvenue response");
      }
    }

    // Server-to-server Order Status Tracker API
    if (this.merchantId && this.accessCode) {
      try {
        const statusReqParams = new URLSearchParams({
          order_no: gatewayOrderId || orderId,
        });
        const encRequest = encryptCCAvenue(statusReqParams.toString(), this.workingKey);

        const statusApiUrl = this.isSandbox
          ? "https://test.ccavenue.com/apis/servlet/DoWebTrans"
          : "https://api.ccavenue.com/apis/servlet/DoWebTrans";

        const res = await fetch(statusApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            enc_request: encRequest,
            access_code: this.accessCode,
            request_type: "JSON",
            response_type: "JSON",
            command: "orderStatusTracker",
            version: "1.2",
          }).toString(),
        });

        const textResp = await res.text();
        const decryptedResp = decryptCCAvenue(textResp.trim(), this.workingKey);
        const statusData = JSON.parse(decryptedResp);

        const isSuccess = statusData.order_status?.toLowerCase() === "shipped" || statusData.order_status?.toLowerCase() === "successful";

        return {
          success: isSuccess,
          transactionId: statusData.reference_no || gatewayPaymentId || orderId,
          status: isSuccess ? "succeeded" : "failed",
          amountCents: Math.round(parseFloat(statusData.order_amt || "0") * 100) || input.amountCents,
          currency: "INR",
          gateway: this.id,
          errorMessage: isSuccess ? undefined : `CCAvenue status: ${statusData.order_status}`,
        };
      } catch (err) {
        console.warn("CCAvenue S2S status check fallback:", err);
      }
    }

    throw new Error("Missing CCAvenue encrypted response payload (encResp) for verification.");
  }

  async refund(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    if (!this.merchantId || !this.workingKey || !this.accessCode) {
      throw new Error("CCAvenue credentials required for refunds.");
    }

    try {
      const refundToken = `ref_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
      const amountStr = (input.amountCents / 100).toFixed(2);

      const refundParams = new URLSearchParams({
        reference_no: input.transactionId,
        refund_amount: amountStr,
        refund_ref_no: refundToken,
        reason: input.reason || "Customer cancellation requested",
      });

      const encRequest = encryptCCAvenue(refundParams.toString(), this.workingKey);
      const refundApiUrl = this.isSandbox
        ? "https://test.ccavenue.com/apis/servlet/DoWebTrans"
        : "https://api.ccavenue.com/apis/servlet/DoWebTrans";

      const res = await fetch(refundApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          enc_request: encRequest,
          access_code: this.accessCode,
          request_type: "JSON",
          response_type: "JSON",
          command: "cancelOrder",
          version: "1.2",
        }).toString(),
      });

      const textResp = await res.text();
      const decryptedResp = decryptCCAvenue(textResp.trim(), this.workingKey);
      const refundData = JSON.parse(decryptedResp);

      const isSuccess = refundData.refund_status === "0" || refundData.status?.toLowerCase() === "success";

      return {
        success: isSuccess,
        refundId: refundData.refund_ref_no || refundToken,
        amountCents: input.amountCents,
        status: isSuccess ? "succeeded" : "failed",
        errorMessage: isSuccess ? undefined : refundData.reason || "CCAvenue refund rejected",
      };
    } catch (err) {
      return {
        success: false,
        refundId: "",
        amountCents: input.amountCents,
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "CCAvenue refund failed",
      };
    }
  }

  async verifyWebhook(input: WebhookVerificationInput): Promise<WebhookEventResult> {
    if (!this.workingKey) {
      return { isValid: false, eventType: "unknown", error: "Missing CCAVENUE_WORKING_KEY" };
    }

    try {
      const params = new URLSearchParams(input.rawBody);
      const encResp = params.get("encResp") || input.rawBody;

      const decrypted = decryptCCAvenue(encResp, this.workingKey);
      const data = new URLSearchParams(decrypted);

      const orderStatus = data.get("order_status")?.toLowerCase();
      const isSuccess = orderStatus === "success";
      const trackingId = data.get("tracking_id");
      const orderId = data.get("order_id") || data.get("merchant_param1");
      const amountStr = data.get("amount");

      return {
        isValid: true,
        eventType: isSuccess ? "payment.succeeded" : "payment.failed",
        orderId: orderId || undefined,
        transactionId: trackingId || undefined,
        amountCents: amountStr ? Math.round(parseFloat(amountStr) * 100) : undefined,
        metadata: Object.fromEntries(data.entries()),
      };
    } catch (err) {
      return { isValid: false, eventType: "unknown", error: "Failed to decrypt CCAvenue webhook payload" };
    }
  }
}
