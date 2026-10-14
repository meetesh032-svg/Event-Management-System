"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Landmark, Smartphone, Wallet, Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { formatRupees } from "@/lib/format";

const PAYMENT_METHODS = [
  { id: "upi", title: "UPI", icon: Smartphone, description: "Google Pay, PhonePe, Paytm, BHIM" },
  { id: "card", title: "Credit / Debit Card", icon: CreditCard, description: "Visa, Mastercard, RuPay" },
  { id: "netbanking", title: "Net Banking", icon: Landmark, description: "HDFC, SBI, ICICI, Axis & more" },
  { id: "wallet", title: "Wallets", icon: Wallet, description: "Paytm, PhonePe, Amazon Pay" },
];

function CheckoutFakeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId = searchParams.get("session_id");
  const eventId = searchParams.get("eventId");
  const userId = searchParams.get("userId");
  const amountStr = searchParams.get("amount");
  const title = searchParams.get("title");

  const amountNum = amountStr ? parseInt(amountStr, 10) : 0;
  const formattedAmount = formatRupees(amountNum);

  const [selectedMethod, setSelectedMethod] = useState(PAYMENT_METHODS[0].id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePayment = () => {
    setIsProcessing(true);

    // Simulate network delay and payment processing
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      
      // Redirect to success page after brief success animation
      setTimeout(() => {
        router.push(`/bookings/success?session_id=${sessionId}&fake_event_id=${eventId}&fake_user_id=${userId}`);
      }, 1500);
    }, 2500);
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
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedMethod(method.id)}
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
                      <div>
                        <div className={`font-medium ${isSelected ? "text-indigo-100" : "text-white"}`}>
                          {method.title}
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
            </div>

            {/* Order Summary & Pay */}
            <div className="bg-slate-900/80 p-8 md:col-span-2 flex flex-col">
              <h2 className="mb-6 text-lg font-semibold text-white">Order Summary</h2>
              
              <div className="flex-1 space-y-4">
                <div className="flex justify-between text-slate-300">
                  <span>Ticket (x1)</span>
                  <span>{formattedAmount}</span>
                </div>
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

              <div className="mt-8">
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
