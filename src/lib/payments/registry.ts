import { IPaymentProvider, PaymentGatewayId, GatewayUIInfo } from "./types";
import { StripeProvider } from "./providers/StripeProvider";
import { RazorpayProvider } from "./providers/RazorpayProvider";
import { CashfreeProvider } from "./providers/CashfreeProvider";
import { PhonePeProvider } from "./providers/PhonePeProvider";
import { PayPalProvider } from "./providers/PayPalProvider";
import { PayUProvider } from "./providers/PayUProvider";
import { CCAvenueProvider } from "./providers/CCAvenueProvider";
import { BankTransferProvider } from "./providers/BankTransferProvider";
import { CashOnEventProvider } from "./providers/CashOnEventProvider";
import { FreeEventProvider } from "./providers/FreeEventProvider";
import { WalletProvider } from "./providers/WalletProvider";

export class PaymentProviderRegistry {
  private static instance: PaymentProviderRegistry;
  private providers = new Map<PaymentGatewayId, IPaymentProvider>();

  private constructor() {
    this.registerDefaultProviders();
  }

  public static getInstance(): PaymentProviderRegistry {
    if (!PaymentProviderRegistry.instance) {
      PaymentProviderRegistry.instance = new PaymentProviderRegistry();
    }
    return PaymentProviderRegistry.instance;
  }

  private registerDefaultProviders() {
    // 1. UPI & Fast Indian Gateways
    this.register(new RazorpayProvider());
    this.register(new PhonePeProvider());
    this.register(new CashfreeProvider());

    // 2. Cards & Global Gateways
    this.register(new StripeProvider());
    this.register(new PayPalProvider());

    // 3. Indian Banking & NetBanking Gateways
    this.register(new PayUProvider());
    this.register(new CCAvenueProvider());

    // 4. In-App Wallet
    this.register(new WalletProvider());

    // 5. Offline & Special Workflows
    this.register(new BankTransferProvider());
    this.register(new CashOnEventProvider());
    this.register(new FreeEventProvider());
  }

  /**
   * Register a new payment provider without altering existing application code.
   */
  public register(provider: IPaymentProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Retrieve a specific provider by ID.
   */
  public getProvider(id: PaymentGatewayId): IPaymentProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Unsupported payment gateway: "${id}". Ensure it is registered in PaymentProviderRegistry.`);
    }
    return provider;
  }

  /**
   * List all registered providers.
   */
  public getAllProviders(): IPaymentProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get UI info for all active gateways, optionally filtering by transaction amount.
   */
  public getActiveGatewayInfos(amountCents: number, currency = "INR"): GatewayUIInfo[] {
    const all = Array.from(this.providers.values()).map((p) => p.getUIInfo());

    if (amountCents === 0) {
      // For free tickets, prioritize FreeEventProvider
      return all.filter((g) => g.id === "free");
    }

    // Otherwise show all standard gateways except 'free'
    return all.filter((g) => g.id !== "free" && g.supportedCurrencies.includes(currency));
  }
}

export const paymentRegistry = PaymentProviderRegistry.getInstance();
