export type PaymentGatewayId =
  | "stripe"
  | "razorpay"
  | "cashfree"
  | "phonepe"
  | "paypal"
  | "payu"
  | "ccavenue"
  | "bank_transfer"
  | "cash_on_event"
  | "free"
  | "wallet";

export type PaymentMode = "sandbox" | "live";

export interface CustomerInfo {
  name: string;
  email: string;
  phone?: string;
  userId?: number;
}

export interface PaymentItem {
  id?: string | number;
  title: string;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
}

export interface FeeBreakdown {
  subtotalCents: number;
  taxesCents: number;
  taxRatePercent: number; // e.g. 18% GST
  platformFeeCents: number;
  convenienceFeeCents: number;
  discountCents: number;
  couponCode?: string | null;
  totalAmountCents: number;
}

export interface CreatePaymentOrderInput {
  orderId: string; // unique application order reference e.g. ORD-1729...
  amountCents: number; // in smallest unit (cents/paise)
  currency: string; // "INR" | "USD"
  description: string;
  customer: CustomerInfo;
  items?: PaymentItem[];
  metadata?: Record<string, any>;
  returnUrl: string;
  cancelUrl: string;
}

export interface PaymentOrderResult {
  orderId: string;
  gatewayOrderId: string;
  gateway: PaymentGatewayId;
  amountCents: number;
  currency: string;
  status: "created" | "pending" | "succeeded" | "failed";
  checkoutUrl?: string;
  clientSecret?: string;
  gatewayPayload?: Record<string, any>;
}

export interface VerifyPaymentInput {
  orderId: string;
  gatewayPaymentId: string;
  gatewayOrderId?: string;
  gatewaySignature?: string;
  amountCents: number;
  rawPayload?: Record<string, any>;
}

export interface VerifyPaymentResult {
  success: boolean;
  transactionId: string;
  status: "succeeded" | "failed" | "pending";
  amountCents: number;
  currency: string;
  gateway: PaymentGatewayId;
  errorMessage?: string;
  paymentMethodDetails?: {
    method: string;
    brand?: string;
    last4?: string;
    upiId?: string;
    bankName?: string;
    walletType?: string;
  };
}

export interface RefundPaymentInput {
  transactionId: string;
  amountCents: number;
  reason: string;
  bookingId?: number;
  metadata?: Record<string, any>;
}

export interface RefundPaymentResult {
  success: boolean;
  refundId: string;
  amountCents: number;
  status: "pending" | "succeeded" | "failed";
  errorMessage?: string;
}

export interface WebhookVerificationInput {
  headers: Record<string, string | string[] | undefined>;
  rawBody: string;
}

export interface WebhookEventResult {
  isValid: boolean;
  eventType: "payment.succeeded" | "payment.failed" | "refund.succeeded" | "dispute.created" | "unknown";
  orderId?: string;
  transactionId?: string;
  amountCents?: number;
  metadata?: Record<string, any>;
  error?: string;
}

export interface GatewayUIInfo {
  id: PaymentGatewayId;
  name: string;
  category: "card" | "upi" | "wallet" | "netbanking" | "offline" | "free";
  tagline: string;
  badge?: string;
  popular?: boolean;
  isSandbox: boolean;
  supportedCurrencies: string[];
}

export interface IPaymentProvider {
  readonly id: PaymentGatewayId;
  readonly name: string;
  readonly isSandbox: boolean;

  createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
  refund(input: RefundPaymentInput): Promise<RefundPaymentResult>;
  verifyWebhook?(input: WebhookVerificationInput): Promise<WebhookEventResult>;
  getUIInfo(): GatewayUIInfo;
}
