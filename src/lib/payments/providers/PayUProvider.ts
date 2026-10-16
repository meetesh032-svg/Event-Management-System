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
import { generatePayURequestHash, verifyPayUResponseHash } from "../crypto-utils";

export class PayUProvider implements IPaymentProvider {
  readonly id: PaymentGatewayId = "payu";
  readonly name = "PayU Hosted Checkout";
  readonly isSandbox: boolean;
  private merchantKey?: string;
  private merchantSalt?: string;
  private baseUrl: string;
  private postServiceUrl: string;

  constructor() {
    this.merchantKey = process.env.PAYU_MERCHANT_KEY;
    this.merchantSalt = process.env.PAYU_MERCHANT_SALT;
    const env = (process.env.PAYU_ENV || process.env.NODE_ENV || "").toLowerCase();
    this.isSandbox = env === "sandbox" || env === "test" || !this.merchantKey || this.merchantKey.includes("TEST");
    this.baseUrl = this.isSandbox ? "https://test.payu.in/_payment" : "https://secure.payu.in/_payment";
    this.postServiceUrl = this.isSandbox
      ? "https://test.payu.in/merchant/postservice?form=2"
      : "https://info.payu.in/merchant/postservice?form=2";
  }

  getUIInfo(): GatewayUIInfo {
    return {
      id: this.id,
      name: "PayU (Cards, NetBanking, UPI, EMI)",
      category: "card",
      tagline: "Official PayU Hosted PG with 3D Secure & Multi-Bank Support",
      badge: "Real Gateway",
      isSandbox: this.isSandbox,
      supportedCurrencies: ["INR"],
    };
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult> {
    if (!this.merchantKey || !this.merchantSalt) {
      throw new Error(
        "PayU credentials (PAYU_MERCHANT_KEY & PAYU_MERCHANT_SALT) are required in environment variables."
      );
    }

    const txnid = `txnid_${input.orderId.replace(/[^a-zA-Z0-9]/g, "")}_${Date.now().toString().slice(-4)}`;
    const amountStr = (input.amountCents / 100).toFixed(2);
    const cleanProductInfo = input.description.slice(0, 100).replace(/[^a-zA-Z0-9 ]/g, "") || "Gatherly Booking";
    const firstName = (input.customer.name.split(" ")[0] || "Guest").replace(/[^a-zA-Z0-9]/g, "");
    const email = input.customer.email;

    const hash = generatePayURequestHash({
      key: this.merchantKey,
      txnid,
      amount: amountStr,
      productinfo: cleanProductInfo,
      firstname: firstName,
      email,
      salt: this.merchantSalt,
    });

    const payload = {
      key: this.merchantKey,
      txnid,
      amount: amountStr,
      productinfo: cleanProductInfo,
      firstname: firstName,
      email,
      phone: input.customer.phone || "9876543210",
      surl: `${input.returnUrl}&gateway=payu`,
      furl: `${input.cancelUrl}&gateway=payu&status=failed`,
      hash,
      service_provider: "payu_paisa",
    };

    return {
      orderId: input.orderId,
      gatewayOrderId: txnid,
      gateway: this.id,
      amountCents: input.amountCents,
      currency: "INR",
      status: "created",
      clientSecret: hash,
      checkoutUrl: this.baseUrl,
      gatewayPayload: {
        actionUrl: this.baseUrl,
        params: payload,
      },
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    if (!this.merchantKey || !this.merchantSalt) {
      throw new Error("PayU credentials required for payment verification.");
    }

    const { rawPayload, gatewayPaymentId, gatewayOrderId, orderId } = input;
    const txnid = gatewayOrderId || rawPayload?.txnid || orderId;

    // 1. If callback payload was provided from PayU POST redirect, verify reverse hash
    if (rawPayload && rawPayload.hash && rawPayload.status) {
      const isStatusSuccess = rawPayload.status.toLowerCase() === "success";
      if (!isStatusSuccess) {
        return {
          success: false,
          transactionId: rawPayload.mihpayid || gatewayPaymentId || txnid,
          status: "failed",
          amountCents: input.amountCents,
          currency: "INR",
          gateway: this.id,
          errorMessage: `PayU payment status: ${rawPayload.status} (${rawPayload.error_Message || "Transaction failed"})`,
        };
      }

      const isHashValid = verifyPayUResponseHash({
        status: rawPayload.status,
        txnid: rawPayload.txnid || txnid,
        amount: rawPayload.amount,
        productinfo: rawPayload.productinfo,
        firstname: rawPayload.firstname,
        email: rawPayload.email,
        key: this.merchantKey,
        salt: this.merchantSalt,
        receivedHash: rawPayload.hash,
        additionalCharges: rawPayload.additionalCharges,
      });

      if (!isHashValid) {
        return {
          success: false,
          transactionId: rawPayload.mihpayid || txnid,
          status: "failed",
          amountCents: input.amountCents,
          currency: "INR",
          gateway: this.id,
          errorMessage: "PayU response hash verification failed: potential tampering detected.",
        };
      }

      return {
        success: true,
        transactionId: rawPayload.mihpayid?.toString() || gatewayPaymentId || txnid,
        status: "succeeded",
        amountCents: Math.round(parseFloat(rawPayload.amount) * 100),
        currency: "INR",
        gateway: this.id,
        paymentMethodDetails: {
          method: rawPayload.mode || "payu_pg",
          brand: rawPayload.bankcode,
          bankName: rawPayload.bank_ref_num,
        },
      };
    }

    // 2. Official PayU Server-to-Server Verify Payment API
    try {
      const verifyHash = crypto
        .createHash("sha512")
        .update(`${this.merchantKey}|verify_payment|${txnid}|${this.merchantSalt}`)
        .digest("hex");

      const formBody = new URLSearchParams({
        key: this.merchantKey,
        command: "verify_payment",
        var1: txnid,
        hash: verifyHash,
      });

      const res = await fetch(this.postServiceUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody.toString(),
      });

      const data = await res.json();
      const txnDetail = data?.transaction_details?.[txnid];

      if (!txnDetail || txnDetail.status?.toLowerCase() !== "success") {
        return {
          success: false,
          transactionId: txnDetail?.mihpayid || txnid,
          status: "failed",
          amountCents: input.amountCents,
          currency: "INR",
          gateway: this.id,
          errorMessage: `PayU S2S status check: ${txnDetail?.status || data?.msg || "Transaction not found or not successful"}`,
        };
      }

      return {
        success: true,
        transactionId: txnDetail.mihpayid?.toString() || txnid,
        status: "succeeded",
        amountCents: Math.round(parseFloat(txnDetail.amt || txnDetail.transaction_amount) * 100),
        currency: "INR",
        gateway: this.id,
        paymentMethodDetails: {
          method: txnDetail.mode || "payu",
          brand: txnDetail.card_type,
          bankName: txnDetail.bank_ref_num,
        },
      };
    } catch (err) {
      console.error("PayU verification error:", err);
      throw new Error(err instanceof Error ? err.message : "Failed to verify PayU transaction");
    }
  }

  async refund(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    if (!this.merchantKey || !this.merchantSalt) {
      throw new Error("PayU credentials required for refunds.");
    }

    try {
      const amountStr = (input.amountCents / 100).toFixed(2);
      const refundToken = `ref_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
      const hash = crypto
        .createHash("sha512")
        .update(`${this.merchantKey}|cancel_refund_transaction|${input.transactionId}|${this.merchantSalt}`)
        .digest("hex");

      const formBody = new URLSearchParams({
        key: this.merchantKey,
        command: "cancel_refund_transaction",
        var1: input.transactionId,
        var2: refundToken,
        var3: amountStr,
        hash,
      });

      const res = await fetch(this.postServiceUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody.toString(),
      });

      const data = await res.json();
      const isSuccess = data?.status === 1 || data?.msg === "Refund initiated successfully";

      return {
        success: isSuccess,
        refundId: data?.request_id?.toString() || refundToken,
        amountCents: input.amountCents,
        status: isSuccess ? "succeeded" : "failed",
        errorMessage: isSuccess ? undefined : data?.msg || "PayU refund request rejected",
      };
    } catch (err) {
      return {
        success: false,
        refundId: "",
        amountCents: input.amountCents,
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "PayU refund failed",
      };
    }
  }

  async verifyWebhook(input: WebhookVerificationInput): Promise<WebhookEventResult> {
    try {
      const params = new URLSearchParams(input.rawBody);
      const rawPayload: Record<string, string> = {};
      params.forEach((v, k) => {
        rawPayload[k] = v;
      });

      if (!rawPayload.hash || !this.merchantKey || !this.merchantSalt) {
        return { isValid: false, eventType: "unknown", error: "Missing PayU webhook signature or keys" };
      }

      const isValid = verifyPayUResponseHash({
        status: rawPayload.status,
        txnid: rawPayload.txnid,
        amount: rawPayload.amount,
        productinfo: rawPayload.productinfo,
        firstname: rawPayload.firstname,
        email: rawPayload.email,
        key: this.merchantKey,
        salt: this.merchantSalt,
        receivedHash: rawPayload.hash,
        additionalCharges: rawPayload.additionalCharges,
      });

      const isSuccess = rawPayload.status?.toLowerCase() === "success";

      return {
        isValid,
        eventType: isValid && isSuccess ? "payment.succeeded" : "payment.failed",
        orderId: rawPayload.txnid,
        transactionId: rawPayload.mihpayid,
        amountCents: rawPayload.amount ? Math.round(parseFloat(rawPayload.amount) * 100) : undefined,
        metadata: rawPayload,
      };
    } catch (err) {
      return { isValid: false, eventType: "unknown", error: "Invalid PayU webhook payload" };
    }
  }
}
