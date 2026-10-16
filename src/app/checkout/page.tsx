"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Smartphone,
  Wallet,
  Zap,
  Globe,
  Landmark,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Tag,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Sparkles,
  Lock,
  ExternalLink,
  Calendar,
  MapPin,
  Ticket,
  ChevronRight,
  Shield,
  Layers,
  Award,
} from "lucide-react";
import { formatRupees } from "@/lib/format";
import { Button, Badge } from "@/components/ui";
import { PaymentGatewayId, GatewayUIInfo } from "@/lib/payments/types";

const iconMap: Record<PaymentGatewayId, React.ElementType> = {
  stripe: CreditCard,
  razorpay: Zap,
  phonepe: Smartphone,
  cashfree: ShieldCheck,
  paypal: Globe,
  payu: CreditCard,
  ccavenue: Landmark,
  wallet: Wallet,
  bank_transfer: Landmark,
  cash_on_event: Layers,
  free: Sparkles,
};

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventId = searchParams.get("eventId");
  const userId = searchParams.get("userId");
  const initialAmountStr = searchParams.get("amount");
  const originalAmountStr = searchParams.get("original_amount");
  const title = searchParams.get("title");
  const seatsParam = searchParams.get("seats");
  const quantityParam = searchParams.get("quantity");
  const initialCoupon = searchParams.get("coupon") || "";
  const initialDiscountStr = searchParams.get("discount") || "0";
  const isGuest = searchParams.get("is_guest") === "true";
  const guestEmail = searchParams.get("guest_email") || "";
  const guestName = searchParams.get("guest_name") || "";
  const cancelled = searchParams.get("cancelled") === "true";

  const parsedSeats: string[] = useMemo(() => {
    if (!seatsParam) return [];
    try {
      return JSON.parse(seatsParam);
    } catch {
      return seatsParam.split(",").map((s) => s.trim());
    }
  }, [seatsParam]);

  const quantity = quantityParam ? parseInt(quantityParam, 10) : parsedSeats.length > 0 ? parsedSeats.length : 1;
  const initialSubtotal = originalAmountStr
    ? parseInt(originalAmountStr, 10)
    : initialAmountStr
    ? parseInt(initialAmountStr, 10)
    : 0;

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(3);
  const [eventData, setEventData] = useState<any>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  // Active Gateways from Backend Registry
  const [gateways, setGateways] = useState<GatewayUIInfo[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayId>("razorpay");
  const [walletBalanceCents, setWalletBalanceCents] = useState<number>(0);
  const [useWallet, setUseWallet] = useState(false);

  // Coupons
  const [couponCode, setCouponCode] = useState(initialCoupon);
  const [appliedCoupon, setAppliedCoupon] = useState(initialCoupon);
  const [discountCents, setDiscountCents] = useState(parseInt(initialDiscountStr, 10));
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponMsg, setCouponMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Processing & Verification
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>("Connecting to official payment gateway...");
  const [paymentError, setPaymentError] = useState<string | null>(
    cancelled ? "Previous payment was cancelled. You can retry with any verified gateway below." : null
  );

  // 10-Minute Seat Hold Countdown Timer
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(600);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Fetch Event
  useEffect(() => {
    if (eventId) {
      fetch(`/api/events/${eventId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.event) setEventData(data.event);
        })
        .catch(() => {})
        .finally(() => setLoadingEvent(false));
    } else {
      setLoadingEvent(false);
    }
  }, [eventId]);

  // Fetch Available Payment Gateways
  useEffect(() => {
    fetch(`/api/payments/methods?amount=${initialSubtotal}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.gateways) {
          setGateways(data.gateways);
          if (data.gateways.length > 0) {
            setSelectedGateway(data.gateways[0].id);
          }
        }
        if (data.userWalletBalanceCents !== undefined) {
          setWalletBalanceCents(data.userWalletBalanceCents);
        }
      })
      .catch(() => {});
  }, [initialSubtotal]);

  // Price Calculation Breakdown
  const discountedBase = Math.max(0, initialSubtotal - discountCents);
  const convenienceFeeCents = initialSubtotal > 0 ? 2500 : 0;
  const platformFeeCents = initialSubtotal > 0 ? 500 : 0;
  const taxesCents = initialSubtotal > 0 ? Math.round(((convenienceFeeCents + platformFeeCents) * 18) / 100) : 0;
  const subtotalWithFees = discountedBase + convenienceFeeCents + platformFeeCents + taxesCents;
  const walletDeduction = useWallet ? Math.min(subtotalWithFees, walletBalanceCents) : 0;
  const finalTotalAmount = Math.max(0, subtotalWithFees - walletDeduction);

  // Coupon Handler
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
          orderTotalCents: initialSubtotal,
          eventId: eventId ? Number(eventId) : undefined,
          quantity,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid coupon");

      setAppliedCoupon(data.code);
      setDiscountCents(data.discountCents);
      setCouponMsg({
        text: `Coupon ${data.code} applied! Saved ${formatRupees(data.discountCents)}`,
        isError: false,
      });
    } catch (err) {
      setCouponMsg({
        text: err instanceof Error ? err.message : "Failed to apply coupon",
        isError: true,
      });
    } finally {
      setValidatingCoupon(false);
    }
  };

  // Dynamically load Razorpay SDK script if needed
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && (window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // REAL Payment Execution Workflow
  const handlePay = async () => {
    if (timeLeftSeconds <= 0) {
      setPaymentError("Your seat reservation timer has expired. Please re-select seats to proceed.");
      return;
    }

    if (selectedGateway === "wallet" && walletBalanceCents < finalTotalAmount) {
      setPaymentError(
        `Insufficient wallet balance (${formatRupees(walletBalanceCents)}). Please choose another payment gateway.`
      );
      return;
    }

    setPaymentError(null);
    setIsProcessing(true);
    setProcessingStage(`Creating official ${selectedGateway.toUpperCase()} order on backend...`);

    try {
      // 1. Create official order on backend with database reservation and strict amounts
      const createRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: Number(eventId),
          gatewayId: selectedGateway,
          quantity,
          seatNumbers: parsedSeats,
          couponCode: appliedCoupon,
          isGuest,
          guestEmail,
          guestName,
          useWallet,
        }),
      });

      const orderData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(orderData.error || "Failed to create payment order on gateway");
      }

      // 2. Gateway-specific flow routing:
      // A. STRIPE: Hosted checkout with 3DS 2.0
      if (selectedGateway === "stripe") {
        if (orderData.orderResult.checkoutUrl) {
          setProcessingStage("Redirecting to official Stripe 3D-Secure Checkout...");
          window.location.href = orderData.orderResult.checkoutUrl;
          return;
        }
        throw new Error("Stripe checkout URL missing from gateway response.");
      }

      // B. RAZORPAY: Official Standard Checkout Modal with HMAC signature verification
      if (selectedGateway === "razorpay") {
        setProcessingStage("Opening official Razorpay checkout modal...");
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          throw new Error("Failed to load Razorpay SDK script. Please check your internet connection.");
        }

        const options = {
          ...orderData.orderResult.gatewayPayload,
          handler: async function (response: any) {
            setProcessingStage("Verifying cryptographic signature & status on backend...");
            try {
              const verifyRes = await fetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  gatewayId: "razorpay",
                  orderId: orderData.orderResult.orderId,
                  gatewayPaymentId: response.razorpay_payment_id,
                  gatewayOrderId: response.razorpay_order_id,
                  gatewaySignature: response.razorpay_signature,
                }),
              });

              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) {
                throw new Error(verifyData.error || "Backend signature verification failed");
              }

              router.push(
                `/bookings/success?session_id=${verifyData.booking.stripeSessionId}&booking_ref=${verifyData.booking.reference}`
              );
            } catch (err) {
              setIsProcessing(false);
              setPaymentError(err instanceof Error ? err.message : "Verification failed");
            }
          },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
              setPaymentError("Payment was cancelled in Razorpay modal. You can retry before your seat hold expires.");
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        return;
      }

      // C. CASHFREE, PHONEPE, PAYPAL, CCAVENUE: Official hosted payment redirects
      if (
        selectedGateway === "cashfree" ||
        selectedGateway === "phonepe" ||
        selectedGateway === "paypal" ||
        selectedGateway === "ccavenue"
      ) {
        if (orderData.orderResult.checkoutUrl) {
          setProcessingStage(`Redirecting to official ${selectedGateway.toUpperCase()} payment portal...`);
          window.location.href = orderData.orderResult.checkoutUrl;
          return;
        }
        throw new Error(`${selectedGateway.toUpperCase()} checkout URL was not returned by gateway.`);
      }

      // D. PAYU: Official PayU Hosted PG Form Submission
      if (selectedGateway === "payu") {
        setProcessingStage("Redirecting to official PayU Secure Gateway...");
        const actionUrl = orderData.orderResult.gatewayPayload?.actionUrl || "https://secure.payu.in/_payment";
        const formParams = orderData.orderResult.gatewayPayload?.params || {};

        const form = document.createElement("form");
        form.method = "POST";
        form.action = actionUrl;

        for (const [key, val] of Object.entries(formParams)) {
          const hiddenField = document.createElement("input");
          hiddenField.type = "hidden";
          hiddenField.name = key;
          hiddenField.value = String(val);
          form.appendChild(hiddenField);
        }

        document.body.appendChild(form);
        form.submit();
        return;
      }

      // E. WALLET & FREE: Direct backend debit & confirmation
      if (selectedGateway === "wallet" || selectedGateway === "free") {
        setProcessingStage("Validating and confirming reservation...");
        const verifyRes = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gatewayId: selectedGateway,
            orderId: orderData.orderResult.orderId,
            gatewayPaymentId: orderData.orderResult.gatewayOrderId || orderData.orderResult.orderId,
          }),
        });

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) {
          throw new Error(verifyData.error || "Reservation confirmation failed");
        }

        router.push(
          `/bookings/success?session_id=${verifyData.booking.stripeSessionId}&booking_ref=${verifyData.booking.reference}`
        );
        return;
      }

      throw new Error(`Unsupported payment gateway: ${selectedGateway}`);
    } catch (err) {
      setIsProcessing(false);
      setPaymentError(err instanceof Error ? err.message : "Payment initialization failed");
    }
  };

  if (!eventId) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center bg-gray-50">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-3" />
        <h2 className="text-xl font-bold text-gray-900">Checkout Session Expired</h2>
        <p className="mt-1 text-xs text-gray-500">No active event or booking session was found.</p>
        <Link href="/events" className="mt-4">
          <Button variant="primary">Explore Events</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#F8F9FA] min-h-screen py-8 sm:py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Top Breadcrumb & Seat Hold Timer */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/events/${eventId}`}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Event Details
          </Link>

          <div className="flex items-center gap-2.5">
            <div
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold border transition-colors shadow-sm ${
                timeLeftSeconds < 120
                  ? "bg-rose-50 text-rose-600 border-rose-200 animate-pulse"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Seats reserved for {formatTimer(timeLeftSeconds)}</span>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
              <Shield className="h-3.5 w-3.5" />
              <span>256-Bit SSL Secured</span>
            </div>
          </div>
        </div>

        {/* Progress Stepper Header */}
        <div className="mb-8 bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-2 cursor-pointer ${
                currentStep >= 1 ? "text-[#F84464] font-bold" : "text-gray-400"
              }`}
            >
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep >= 1 ? "bg-[#F84464] text-white" : "bg-gray-200 text-gray-600"
                }`}
              >
                1
              </div>
              <span className="text-xs sm:text-sm">Show Details</span>
            </div>

            <div className="h-0.5 flex-1 max-w-[60px] sm:max-w-[100px] bg-gray-200" />

            <div
              onClick={() => setCurrentStep(2)}
              className={`flex items-center gap-2 cursor-pointer ${
                currentStep >= 2 ? "text-[#F84464] font-bold" : "text-gray-400"
              }`}
            >
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep >= 2 ? "bg-[#F84464] text-white" : "bg-gray-200 text-gray-600"
                }`}
              >
                2
              </div>
              <span className="text-xs sm:text-sm">Offers & Promos</span>
            </div>

            <div className="h-0.5 flex-1 max-w-[60px] sm:max-w-[100px] bg-gray-200" />

            <div
              onClick={() => setCurrentStep(3)}
              className={`flex items-center gap-2 cursor-pointer ${
                currentStep >= 3 ? "text-[#F84464] font-bold" : "text-gray-400"
              }`}
            >
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep >= 3 ? "bg-[#F84464] text-white" : "bg-gray-200 text-gray-600"
                }`}
              >
                3
              </div>
              <span className="text-xs sm:text-sm">Payment Gateway</span>
            </div>
          </div>
        </div>

        {/* Main Grid: Left Gateway Selection & Event Info | Right Price Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Show Details, Coupon & Payment Gateways */}
          <div className="lg:col-span-7 space-y-6">
            {/* Event Summary Box */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm overflow-hidden">
              <div className="flex items-start gap-4">
                <div className="relative h-28 w-22 shrink-0 overflow-hidden rounded-xl bg-gray-100 border border-gray-200 shadow-sm">
                  <Image
                    src={eventData?.imageUrl || "/placeholder-event.jpg"}
                    alt={title || "Event Poster"}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#FFF0F3] px-2.5 py-0.5 text-[11px] font-bold text-[#F84464] uppercase tracking-wider">
                      {eventData?.category || "Entertainment"}
                    </span>
                    {eventData?.isFeatured && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        Featured
                      </span>
                    )}
                  </div>

                  <h1 className="text-base sm:text-lg font-bold text-gray-900 mt-1 truncate">
                    {title || eventData?.title || "Live Performance"}
                  </h1>

                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 truncate">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                    <span>{eventData?.location || "Venue Arena"}</span>
                  </p>

                  {eventData?.startsAt && (
                    <p className="text-xs font-semibold text-gray-700 mt-1 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-[#F84464]" />
                      <span>
                        {new Date(eventData.startsAt).toLocaleDateString("en-IN", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Reserved Seats display */}
              {parsedSeats.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Selected Seats ({parsedSeats.length}):
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {parsedSeats.map((seat) => (
                        <span
                          key={seat}
                          className="rounded-lg bg-[#FFF0F3] border border-[#F84464]/30 px-2.5 py-0.5 text-xs font-bold text-[#F84464]"
                        >
                          {seat}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Held for You
                  </span>
                </div>
              )}
            </div>

            {/* Coupons & Promo Codes */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Tag className="h-4 w-4 text-[#F84464]" /> Apply Coupon or Discount Code
                </h2>
                {discountCents > 0 && (
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                    Saved {formatRupees(discountCents)}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter code (e.g. WELCOME20)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs font-mono uppercase placeholder:font-sans placeholder:normal-case outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleApplyCoupon}
                  isLoading={validatingCoupon}
                  disabled={!couponCode.trim()}
                >
                  Apply Code
                </Button>
              </div>

              {couponMsg && (
                <p
                  className={`mt-2 text-xs font-semibold ${
                    couponMsg.isError ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {couponMsg.text}
                </p>
              )}

              {/* Wallet Balance Integration */}
              {walletBalanceCents > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-[#F84464]" />
                    <div>
                      <p className="text-xs font-bold text-gray-900">Gatherly Wallet Cash</p>
                      <p className="text-[11px] text-gray-500">Available: {formatRupees(walletBalanceCents)}</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useWallet}
                      onChange={(e) => setUseWallet(e.target.checked)}
                      className="h-4 w-4 rounded text-[#F84464] focus:ring-[#F84464] border-gray-300"
                    />
                    <span className="text-xs font-bold text-gray-700">Apply to Order</span>
                  </label>
                </div>
              )}
            </div>

            {/* Official Payment Gateways Selector */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-[#F84464]" /> Select Payment Gateway
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Production-grade integrations with official SDKs and cryptographic signatures.
                  </p>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> 100% Real PG
                </span>
              </div>

              <div className="space-y-3">
                {gateways.map((gw) => {
                  const Icon = iconMap[gw.id] || CreditCard;
                  const isSelected = selectedGateway === gw.id;

                  return (
                    <div
                      key={gw.id}
                      onClick={() => {
                        setSelectedGateway(gw.id);
                        setPaymentError(null);
                      }}
                      className={`group relative flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-200 select-none ${
                        isSelected
                          ? "border-[#F84464] bg-[#FFF0F3]/30 shadow-sm ring-1 ring-[#F84464]"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                            isSelected
                              ? "bg-[#F84464] text-white shadow-md shadow-[#F84464]/20"
                              : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{gw.name}</span>
                            {gw.badge && (
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                  isSelected ? "bg-[#F84464] text-white" : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {gw.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{gw.tagline}</p>
                        </div>
                      </div>

                      <div
                        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "border-[#F84464] bg-[#F84464]" : "border-gray-300 bg-white"
                        }`}
                      >
                        {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Gateway Routing Notice */}
              <div className="mt-4 p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600 flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-gray-400 shrink-0" />
                <span>
                  Payments are authenticated securely via official {selectedGateway.toUpperCase()} 3D-Secure protocols.
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Live Backend-Calculated Price Summary */}
          <div className="lg:col-span-5 sticky top-24">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
              <h3 className="text-base font-bold text-gray-900 pb-4 border-b border-gray-100">
                Payment Breakdown
              </h3>

              <div className="py-4 space-y-3 text-xs sm:text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Ticket Price ({quantity}x)</span>
                  <span className="font-semibold text-gray-900">{formatRupees(initialSubtotal)}</span>
                </div>

                {discountCents > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Coupon Savings ({appliedCoupon})</span>
                    <span>-{formatRupees(discountCents)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Convenience Fee</span>
                  <span className="font-semibold text-gray-900">{formatRupees(convenienceFeeCents)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Platform Fee</span>
                  <span className="font-semibold text-gray-900">{formatRupees(platformFeeCents)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Taxes (18% GST)</span>
                  <span className="font-semibold text-gray-900">{formatRupees(taxesCents)}</span>
                </div>

                {walletDeduction > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Wallet Balance Applied</span>
                    <span>-{formatRupees(walletDeduction)}</span>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-bold text-gray-400">
                      Total Payable
                    </span>
                    <p className="text-2xl font-black text-gray-900 mt-0.5">
                      {formatRupees(finalTotalAmount)}
                    </p>
                  </div>
                  <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                    INR (₹)
                  </span>
                </div>
              </div>

              {/* Error Notice */}
              {paymentError && (
                <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">Transaction Notice</p>
                    <p className="mt-0.5 leading-relaxed">{paymentError}</p>
                  </div>
                </div>
              )}

              {/* Primary Action Button */}
              <div className="mt-6">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handlePay}
                  disabled={isProcessing || timeLeftSeconds <= 0}
                  className="shadow-lg shadow-[#F84464]/30"
                >
                  Pay {formatRupees(finalTotalAmount)} via {selectedGateway.toUpperCase()}
                </Button>
              </div>

              {/* Security badges */}
              <div className="mt-6 pt-5 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-600">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Bank-Grade 256-Bit SSL Encryption</span>
                </div>
                <p className="text-[11px] text-gray-400 text-center">
                  Official PCI-DSS Level 1 Compliant Checkout • RBI Certified Gateways
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Redirecting Modal Overlay */}
      <AnimatePresence>
        {isProcessing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl border border-gray-100"
            >
              <div className="relative mb-5 flex h-16 w-16 items-center justify-center mx-auto">
                <Loader2 className="h-14 w-14 animate-spin text-[#F84464]" />
                <Lock className="h-6 w-6 text-gray-800 absolute" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Securing Transaction</h3>
              <p className="mt-2 text-xs text-gray-600 font-medium">{processingStage}</p>

              <div className="mt-5 p-3 rounded-xl bg-gray-50 border border-gray-100 text-[11px] text-gray-500">
                Please do not refresh or close this window. Your seats are held safely.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
          <Loader2 className="h-8 w-8 animate-spin text-[#F84464]" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
