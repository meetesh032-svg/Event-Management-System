"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  ShieldAlert,
  Headphones,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui";

function FailureContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventId = searchParams.get("eventId");
  const reason = searchParams.get("reason") || "Transaction declined or cancelled by customer";
  const [releasing, setReleasing] = useState(false);
  const [released, setReleased] = useState(false);

  // Automatically release temporary seat holds if user explicitly cancelled
  useEffect(() => {
    if (eventId && (reason.includes("cancel") || reason.includes("expire"))) {
      setReleasing(true);
      fetch(`/api/events/${eventId}/seats/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatNumbers: [] }), // Endpoint handles user holds
      })
        .then(() => setReleased(true))
        .catch(() => {})
        .finally(() => setReleasing(false));
    }
  }, [eventId, reason]);

  const handleRetry = () => {
    if (eventId) {
      router.push(`/checkout?eventId=${eventId}`);
    } else {
      router.push("/events");
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 py-12 sm:py-20 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl border border-gray-200 bg-white p-8 sm:p-12 shadow-xl"
      >
        {/* Failure Animation Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-5">
          <XCircle className="h-10 w-10" />
        </div>

        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 uppercase tracking-wider">
          Payment Incomplete
        </span>

        <h1 className="mt-3 text-2xl font-black text-gray-900 tracking-tight">
          Payment Was Not Completed
        </h1>

        <p className="mt-2 text-xs sm:text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
          The payment gateway could not authorize your transaction. No funds were debited, and no ticket has been issued.
        </p>

        {/* Detailed Gateway Status Card */}
        <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-left">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-rose-900">Gateway Reason:</span>
              <p className="text-rose-700 mt-0.5 capitalize">{reason.replace(/_/g, " ")}</p>
            </div>
          </div>
          {released && (
            <p className="mt-2 text-[11px] text-gray-500 border-t border-rose-200/40 pt-2 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Temporary seat locks have been released for other attendees.
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="mt-8 space-y-3">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleRetry}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Retry Checkout
          </Button>

          <Link href="/events" className="block w-full">
            <Button variant="outline" size="md" fullWidth leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Browse Other Events
            </Button>
          </Link>
        </div>

        {/* Support & Recovery Assistance */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-500">
          <Headphones className="h-4 w-4 text-[#F84464]" />
          <span>Need help? Contact Gatherly 24/7 Care (Ref: ERR-{Date.now().toString().slice(-6)})</span>
        </div>
      </motion.div>
    </div>
  );
}

export default function CheckoutFailurePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-[#F84464]" />
        </div>
      }
    >
      <FailureContent />
    </Suspense>
  );
}
