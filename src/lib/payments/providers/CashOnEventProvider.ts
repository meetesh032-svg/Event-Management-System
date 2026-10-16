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

export class CashOnEventProvider implements IPaymentProvider {
  readonly id: PaymentGatewayId = "cash_on_event";
  readonly name = "Pay at Box Office / Event Gate";
  readonly isSandbox = false;

  getUIInfo(): GatewayUIInfo {
    return {
      id: this.id,
      name: "Pay at Box Office",
      category: "offline",
      tagline: "Reserve seats online now, pay in cash or card at the venue gate",
      badge: "Pay Later",
      isSandbox: false,
      supportedCurrencies: ["INR"],
    };
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult> {
    const boxOfficeToken = `BOX-${Date.now().toString().slice(-6)}`;

    return {
      orderId: input.orderId,
      gatewayOrderId: boxOfficeToken,
      gateway: this.id,
      amountCents: input.amountCents,
      currency: "INR",
      status: "created",
      clientSecret: boxOfficeToken,
      gatewayPayload: {
        token: boxOfficeToken,
        instructions: "Show this reservation token at the Gatherly Box Office Counter 30 minutes prior to showtime.",
      },
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    return {
      success: true,
      transactionId: `CASH-${Date.now()}`,
      status: "succeeded",
      amountCents: input.amountCents,
      currency: "INR",
      gateway: this.id,
      paymentMethodDetails: {
        method: "cash_on_event",
        bankName: "Box Office Gate Counter Collection",
      },
    };
  }

  async refund(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    return {
      success: true,
      refundId: `CASH_VOID_${Date.now()}`,
      amountCents: input.amountCents,
      status: "succeeded",
    };
  }
}
