"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Landmark,
  Smartphone,
  Wallet,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Globe,
  Calculator,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { formatRupees } from "@/lib/format";

const PAYMENT_METHODS = [
  { id: "upi", title: "UPI Instant Pay", icon: Smartphone, description: "Google Pay, PhonePe, Paytm, QR" },
  { id: "wallet", title: "Gatherly Wallet", icon: Wallet, description: "Instant 1-Click Pay with Wallet Credits" },
  { id: "card", title: "Credit / Debit Card (Stripe)", icon: CreditCard, description: "Visa, Mastercard, RuPay, Amex" },
  { id: "razorpay", title: "Razorpay Checkout", icon: Zap, description: "All Indian Cards, Netbanking & Wallets" },
  { id: "paypal", title: "PayPal", icon: Globe, description: "International & Multi-currency Payments" },
  { id: "emi", title: "Card EMI", icon: Calculator, description: "Pay in 3 to 12 easy monthly installments" },
];

function CheckoutFakeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId = searchParams.get("session_id");
  const eventId = searchParams.get("eventId");
  const userId = searchParams.get("userId");
  const amountStr = searchParams.get("amount");
  const originalAmountStr = searchParams.get("original_amount");
  const title = searchParams.get("title");
  const seatsParam = searchParams.get("seats");
  const quantityParam = searchParams.get("quantity");
  const initialCoupon = searchParams.get("coupon") || "";
  const initialDiscountStr = searchParams.get("discount") || "0";
  const isGuest = searchParams.get("is_guest") === "true";
  const guestEmail = searchParams.get("guest_email") || "";
  const guestName = searchParams.get("guest_name") || "";

  let parsedSeats: string[] = [];
  if (seatsParam) {
    try {
      parsedSeats = JSON.parse(seatsParam);
    } catch {
      parsedSeats = seatsParam.split(",").map((s) => s.trim());
    }
  }

  const quantity = quantityParam ? parseInt(quantityParam, 10) : parsedSeats.length > 0 ? parsedSeats.length : 1;
  const originalAmountNum = originalAmountStr ? parseInt(originalAmountStr, 10) : amountStr ? parseInt(amountStr, 10) : 0;
  
  const [couponCode, setCouponCode] = useState(initialCoupon);
  const [appliedCoupon, setAppliedCoupon] = useState(initialCoupon);
  const [discountCents, setDiscountCents] = useState(parseInt(initialDiscountStr, 10));
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponMsg, setCouponMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const finalAmountNum = Math.max(0, originalAmountNum - discountCents);
  const formattedAmount = formatRupees(finalAmountNum);
  const formattedOriginalAmount = formatRupees(originalAmountNum);

  const [selectedMethod, setSelectedMethod] = useState(PAYMENT_METHODS[0].id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [userWalletBalance, setUserWalletBalance] = useState<number | null>(null);
  const [emiPlans, setEmiPlans] = useState<any[]>([]);
  const [selectedEmiTenure, setSelectedEmiTenure] = useState<number>(3);
  const [loadingEmi, setLoadingEmi] = useState(false);
  const [simulateFailure, setSimulateFailure] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUserWalletBalance(data.user.walletBalanceCents || 0);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedMethod === "emi" && finalAmountNum > 0) {
      setLoadingEmi(true);
      fetch(`/api/payments/emi-plans?amount=${finalAmountNum}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.plans) {
            setEmiPlans(data.plans);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingEmi(false));
    }
  }, [selectedMethod, finalAmountNum]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    setCouponMsg(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim(),
          orderTotalCents: originalAmountNum,
          eventId: eventId ? Number(eventId) : undefined,
          quantity,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid coupon");
      }

      setAppliedCoupon(data.code);
      setDiscountCents(data.discountCents);
      setCouponMsg({ text: `Coupon ${data.code} applied! Saved ${formatRupees(data.discountCents)}`, isError: false });
    } catch (err) {
      setCouponMsg({ text: err instanceof Error ? err.message : "Failed to apply coupon", isError: true });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handlePayment = () => {
    setPaymentError(null);

    // Validate wallet balance if paying with wallet
    if (selectedMethod === "wallet" && userWalletBalance !== null && userWalletBalance < finalAmountNum) {
      setPaymentError(`Insufficient wallet balance (₹${(userWalletBalance / 100).toLocaleString("en-IN")}). Please select another payment method.`);
      return;
    }

    setIsProcessing(true);

    // Simulate network delay and payment processing
    setTimeout(() => {
      if (simulateFailure) {
        setIsProcessing(false);
        setPaymentError("Payment authorization failed by bank gateway (ERR_TIMEOUT). Please retry.");
        return;
      }

      setIsProcessing(false);
      setIsSuccess(true);
      
      // Redirect to success page after brief success animation
      setTimeout(() => {
        let redirectUrl = `/bookings/success?session_id=${sessionId}&fake_event_id=${eventId}&fake_user_id=${userId}&fake_quantity=${quantity}&fake_total=${finalAmountNum}&fake_gateway=${selectedMethod}`;
        if (seatsParam) {
          redirectUrl += `&fake_seats=${encodeURIComponent(seatsParam)}`;
        }
        if (appliedCoupon) {
          redirectUrl += `&fake_coupon=${encodeURIComponent(appliedCoupon)}&fake_discount=${discountCents}`;
        }
        if (isGuest) {
          redirectUrl += `&is_guest=true&guest_email=${encodeURIComponent(guestEmail)}&guest_name=${encodeURIComponent(guestName)}`;
        }
        router.push(redirectUrl);
      }, 1500);
    }, 2000);
  };

  if (!sessionId || !eventId || !userId) {
    return (
      <div className="flex h-screen items-center justify-center text-rose-400">
        <p>Invalid checkout session. Missing parameters.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 shadow-2xl backdrop-blur-xl"
        >
          {/* Header */}
          <div className="border-b border-white/10 bg-indigo-600/10 p-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">Secure Checkout</h1>
            <p className="mt-2 text-indigo-200">
              Complete your payment for <span className="font-semibold text-white">{title}</span>
            </p>
          </div>

          <div className="grid md:grid-cols-5">
            {/* Payment Methods */}
            <div className="border-b border-white/10 md:col-span-3 md:border-b-0 md:border-r p-8">
              <h2 className="mb-6 text-lg font-semibold text-white">Select Payment Method</h2>
              <div className="space-y-4">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  const isSelected = selectedMethod === method.id;

                  return (
                    <motion.button
                      key={method.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => {
                        setSelectedMethod(method.id);
                        setPaymentError(null);
                      }}
                      className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        isSelected ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400"
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isSelected ? "text-indigo-100" : "text-white"}`}>
                            {method.title}
                          </span>
                          {method.id === "wallet" && userWalletBalance !== null && (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              userWalletBalance >= finalAmountNum
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}>
                              ₹{(userWalletBalance / 100).toLocaleString("en-IN")} available
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">{method.description}</div>
                      </div>
                      {isSelected && (
                        <motion.div layoutId="check" className="ml-auto text-indigo-400">
                          <CheckCircle2 className="h-5 w-5" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Contextual Payment Details */}
              <AnimatePresence>
                {selectedMethod === "wallet" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Gatherly Wallet Balance</span>
                      <span className="font-bold text-white text-base">
                        ₹{((userWalletBalance ?? 0) / 100).toLocaleString("en-IN")}
                      </span>
                    </div>
                    {userWalletBalance !== null && userWalletBalance < finalAmountNum ? (
                      <div className="mt-3 rounded-lg bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-300 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>
                          Short by ₹{((finalAmountNum - userWalletBalance) / 100).toLocaleString("en-IN")}. Please switch to UPI or Card.
                        </span>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-emerald-400">
                        ✓ Sufficient balance. 1-click instant confirmation will debit your wallet directly.
                      </p>
                    )}
                  </motion.div>
                )}

                {selectedMethod === "emi" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 rounded-xl border border-white/10 bg-slate-900/60 p-4"
                  >
                    <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-indigo-400" />
                      Select EMI Plan
                    </h3>
                    {loadingEmi ? (
                      <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                        Calculating bank EMI plans...
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {emiPlans.map((plan) => {
                          const isPlanSelected = selectedEmiTenure === plan.tenureMonths;
                          return (
                            <button
                              key={plan.tenureMonths}
                              type="button"
                              onClick={() => setSelectedEmiTenure(plan.tenureMonths)}
                              className={`rounded-lg border p-2.5 text-left transition ${
                                isPlanSelected
                                  ? "border-indigo-500 bg-indigo-500/20 text-white"
                                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                              }`}
                            >
                              <div className="text-xs font-bold text-white">{plan.tenureMonths} Months</div>
                              <div className="text-sm font-semibold text-indigo-300">
                                {formatRupees(plan.monthlyAmountCents)}/mo
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1">
                                {plan.interestRateAnnual}% p.a. • Total: {formatRupees(plan.totalPayableCents)}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Dev/QA Failure Simulation Mode */}
              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                <span>Test Gateway Error / Retry</span>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={simulateFailure}
                    onChange={(e) => setSimulateFailure(e.target.checked)}
                    className="rounded border-white/20 bg-slate-800 text-indigo-600 focus:ring-0"
                  />
                  <span>Simulate Failure</span>
                </label>
              </div>
            </div>

            {/* Order Summary & Pay */}
            <div className="bg-slate-900/80 p-8 md:col-span-2 flex flex-col">
              <h2 className="mb-6 text-lg font-semibold text-white">Order Summary</h2>
              
              <div className="flex-1 space-y-4">
                {isGuest && (
                  <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3 py-2 text-xs text-indigo-200">
                    Guest Checkout: <strong>{guestEmail}</strong>
                  </div>
                )}

                <div className="flex justify-between text-slate-300">
                  <span>Tickets ({quantity}x)</span>
                  <span>{formattedOriginalAmount}</span>
                </div>

                {parsedSeats.length > 0 && (
                  <div className="flex flex-col gap-1.5 py-1">
                    <span className="text-xs text-slate-400">Selected Seats:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {parsedSeats.map((seat) => (
                        <span key={seat} className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-300">
                          {seat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Promo Code Input */}
                <div className="pt-2 border-t border-white/5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Promo code (e.g. WELCOME20)"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white uppercase placeholder:normal-case placeholder-slate-500 outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={validatingCoupon || !couponCode.trim()}
                      className="rounded-xl bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-40"
                    >
                      {validatingCoupon ? "..." : "Apply"}
                    </button>
                  </div>
                  {couponMsg && (
                    <p className={`mt-1.5 text-[11px] font-medium ${couponMsg.isError ? "text-rose-400" : "text-emerald-400"}`}>
                      {couponMsg.text}
                    </p>
                  )}
                </div>

                {discountCents > 0 && (
                  <div className="flex justify-between text-emerald-400 font-medium text-sm">
                    <span>Discount ({appliedCoupon})</span>
                    <span>-{formatRupees(discountCents)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-300">
                  <span>Taxes & Fees</span>
                  <span>₹0.00</span>
                </div>

                <div className="my-4 border-t border-white/10 pt-4">
                  <div className="flex justify-between text-xl font-bold text-white">
                    <span>Total</span>
                    <span>{formattedAmount}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                {paymentError && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300"
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-rose-200">Transaction Failed</p>
                        <p className="mt-0.5">{paymentError}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentError(null);
                        setSimulateFailure(false);
                      }}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 py-1.5 text-xs font-semibold text-rose-100 transition"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Retry Payment
                    </button>
                  </motion.div>
                )}

                <button
                  onClick={handlePayment}
                  disabled={isProcessing || isSuccess}
                  className="group relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-indigo-600 px-8 py-4 font-bold text-white transition-all hover:bg-indigo-500 disabled:opacity-80 disabled:cursor-not-allowed"
                >
                  <AnimatePresence mode="wait">
                    {isProcessing ? (
                      <motion.div
                        key="processing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing...
                      </motion.div>
                    ) : isSuccess ? (
                      <motion.div
                        key="success"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-2 text-emerald-300"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                        Payment Successful!
                      </motion.div>
                    ) : (
                      <motion.div
                        key="pay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        Pay {formattedAmount} Securely
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  256-bit SSL encrypted & secure
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function FakeCheckoutPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>}>
      <CheckoutFakeContent />
    </Suspense>
  );
}
