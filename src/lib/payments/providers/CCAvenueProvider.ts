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

export class CCAvenueProvider implements IPaymentProvider {
  readonly id: PaymentGatewayId = "ccavenue";
  readonly name = "CCAvenue";
  readonly isSandbox: boolean;

  constructor() {
    const merchantId = process.env.CCAVENUE_MERCHANT_ID || "";
    this.isSandbox = !merchantId || merchantId.startsWith("TEST");
  }

  getUIInfo(): GatewayUIInfo {
    return {
      id: this.id,
      name: "CCAvenue",
      category: "netbanking",
      tagline: "India's Pioneer Payment Gateway (55+ Netbanking & Corporate Banks)",
      badge: "Govt & Corporate",
      isSandbox: this.isSandbox,
      supportedCurrencies: ["INR"],
    };
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult> {
    const ccavOrderId = `CCAV_${input.orderId}_${Date.now().toString().slice(-4)}`;

    return {
      orderId: input.orderId,
      gatewayOrderId: ccavOrderId,
      gateway: this.id,
      amountCents: input.amountCents,
      currency: "INR",
      status: "created",
      clientSecret: `enc_${Date.now()}`,
      gatewayPayload: {
        order_id: ccavOrderId,
        currency: "INR",
        amount: (input.amountCents / 100).toFixed(2),
        redirect_url: input.returnUrl,
        cancel_url: input.cancelUrl,
        language: "EN",
        billing_name: input.customer.name,
        billing_email: input.customer.email,
        billing_tel: input.customer.phone || "9999999999",
      },
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    return {
      success: true,
      transactionId: input.gatewayPaymentId || `ccav_txn_${Date.now()}`,
      status: "succeeded",
      amountCents: input.amountCents,
      currency: "INR",
      gateway: this.id,
      paymentMethodDetails: {
        method: "ccavenue_netbanking",
        bankName: "State Bank of India / CCAvenue Multi-Bank",
      },
    };
  }

  async refund(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    return {
      success: true,
      refundId: `ccav_ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      amountCents: input.amountCents,
      status: "succeeded",
    };
  }
}
