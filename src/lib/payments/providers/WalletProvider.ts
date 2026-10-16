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
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export class WalletProvider implements IPaymentProvider {
  readonly id: PaymentGatewayId = "wallet";
  readonly name = "Gatherly Wallet";
  readonly isSandbox = false;

  getUIInfo(): GatewayUIInfo {
    return {
      id: this.id,
      name: "Gatherly Wallet",
      category: "wallet",
      tagline: "Instant 1-Click Pay with Wallet Cash & Rewards",
      badge: "Instant 1-Click",
      popular: true,
      isSandbox: false,
      supportedCurrencies: ["INR"],
    };
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult> {
    const walletOrderId = `WAL_${input.orderId}_${Date.now().toString().slice(-4)}`;

    return {
      orderId: input.orderId,
      gatewayOrderId: walletOrderId,
      gateway: this.id,
      amountCents: input.amountCents,
      currency: "INR",
      status: "created",
      clientSecret: walletOrderId,
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const userId = input.rawPayload?.userId;

    if (userId) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, Number(userId)),
      });

      if (!user || (user.walletBalanceCents || 0) < input.amountCents) {
        return {
          success: false,
          transactionId: input.gatewayPaymentId,
          status: "failed",
          amountCents: input.amountCents,
          currency: "INR",
          gateway: this.id,
          errorMessage: "Insufficient wallet balance. Please select UPI or Credit Card.",
        };
      }
    }

    return {
      success: true,
      transactionId: input.gatewayPaymentId || `WAL_TXN_${Date.now()}`,
      status: "succeeded",
      amountCents: input.amountCents,
      currency: "INR",
      gateway: this.id,
      paymentMethodDetails: {
        method: "wallet_debit",
        walletType: "Gatherly Cash Balance",
      },
    };
  }

  async refund(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    return {
      success: true,
      refundId: `WAL_REF_${Date.now()}`,
      amountCents: input.amountCents,
      status: "succeeded",
    };
  }
}
