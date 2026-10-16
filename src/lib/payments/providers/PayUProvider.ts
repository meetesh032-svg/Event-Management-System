import {
  IPaymentProvider,
  PaymentGatewayId,
  CreatePaymentOrderInput,
  PaymentOrderResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
  RefundPaymentInput,
  RefundPaymentResult,
  GatewayUIInfo,
} from "../types";
import crypto from "crypto";

export class PayUProvider implements IPaymentProvider {
  readonly id: PaymentGatewayId = "payu";
  readonly name = "PayU";
  readonly isSandbox: boolean;
  private merchantKey: string;
  private merchantSalt: string;

  constructor() {
    this.merchantKey = process.env.PAYU_MERCHANT_KEY || "TEST_KEY_PAYU";
    this.merchantSalt = process.env.PAYU_MERCHANT_SALT || "TEST_SALT_PAYU";
    this.isSandbox = this.merchantKey.includes("TEST");
  }

  getUIInfo(): GatewayUIInfo {
    return {
      id: this.id,
      name: "PayU India",
      category: "card",
      tagline: "Credit Cards, Debit Cards, NetBanking & LazyPay",
      badge: "Enterprise",
      isSandbox: this.isSandbox,
      supportedCurrencies: ["INR"],
    };
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult> {
    const txnid = `txnid_${input.orderId}_${Date.now().toString().slice(-4)}`;
    const amountStr = (input.amountCents / 100).toFixed(2);
    const hashString = `${this.merchantKey}|${txnid}|${amountStr}|${input.description}|${input.customer.name}|${input.customer.email}|||||||||||${this.merchantSalt}`;
    const hash = crypto.createHash("sha512").update(hashString).digest("hex");

    return {
      orderId: input.orderId,
      gatewayOrderId: txnid,
      gateway: this.id,
      amountCents: input.amountCents,
      currency: "INR",
      status: "created",
      clientSecret: hash,
      gatewayPayload: {
        key: this.merchantKey,
        txnid,
        amount: amountStr,
        productinfo: input.description,
        firstname: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone || "9876543210",
        surl: input.returnUrl,
        furl: input.cancelUrl,
        hash,
      },
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    return {
      success: true,
      transactionId: input.gatewayPaymentId || `payu_txn_${Date.now()}`,
      status: "succeeded",
      amountCents: input.amountCents,
      currency: "INR",
      gateway: this.id,
      paymentMethodDetails: {
        method: "payu_card",
        brand: "Mastercard",
      },
    };
  }

  async refund(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    return {
      success: true,
      refundId: `payu_ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      amountCents: input.amountCents,
      status: "succeeded",
    };
  }
}
