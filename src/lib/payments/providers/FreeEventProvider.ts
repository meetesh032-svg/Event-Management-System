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

export class FreeEventProvider implements IPaymentProvider {
  readonly id: PaymentGatewayId = "free";
  readonly name = "Free Ticket Registration";
  readonly isSandbox = false;

  getUIInfo(): GatewayUIInfo {
    return {
      id: this.id,
      name: "Free Pass (₹0.00)",
      category: "free",
      tagline: "Complimentary Pass / 100% Discount Applied",
      badge: "Free",
      isSandbox: false,
      supportedCurrencies: ["INR", "USD"],
    };
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult> {
    const freeToken = `FREE-${Date.now().toString().slice(-6)}`;
    return {
      orderId: input.orderId,
      gatewayOrderId: freeToken,
      gateway: this.id,
      amountCents: 0,
      currency: input.currency || "INR",
      status: "succeeded",
      clientSecret: freeToken,
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    return {
      success: true,
      transactionId: `FREE-${Date.now()}`,
      status: "succeeded",
      amountCents: 0,
      currency: "INR",
      gateway: this.id,
      paymentMethodDetails: {
        method: "free_registration",
      },
    };
  }

  async refund(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    return {
      success: true,
      refundId: `FREE_VOID_${Date.now()}`,
      amountCents: 0,
      status: "succeeded",
    };
  }
}
