"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Loader2, MailCheck } from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");
  const tokenParam = searchParams.get("token");

  const [loading, setLoading] = useState(!!tokenParam);
  const [success, setSuccess] = useState(statusParam === "success");
  const [error, setError] = useState(
    statusParam === "invalid"
      ? "This verification link is invalid or has expired."
      : statusParam === "missing"
      ? "Verification token was not found in the link."
      : ""
  );
  const [manualToken, setManualToken] = useState("");

  useEffect(() => {
    if (tokenParam) {
      fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenParam }),
      })
        .then((res) => res.json())
        .then((data) => {
          setLoading(false);
          if (data.success) {
            setSuccess(true);
          } else {
            setError(data.error || "Verification failed");
          }
        })
        .catch(() => {
          setLoading(false);
          setError("Network error while verifying email.");
        });
    }
  }, [tokenParam]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: manualToken.trim() }),
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || "Verification code is invalid or expired.");
      }
    } catch {
      setLoading(false);
      setError("Network error while verifying.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm"
    >
      {loading ? (
        <div className="py-12">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#F84464] mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Verifying your email...</h2>
          <p className="mt-2 text-xs text-gray-500">Please wait while we confirm your credentials.</p>
        </div>
      ) : success ? (
        <div className="py-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Email Verified!</h1>
          <p className="mt-2 text-xs text-gray-500 max-w-sm mx-auto">
            Your email address has been successfully verified. You now have full access to confirmed ticket booking and organizer tools.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/events"
              className="rounded-xl bg-[#F84464] px-6 py-2.5 text-xs font-semibold text-white hover:bg-rose-600 shadow-sm transition"
            >
              Browse Events
            </Link>
          </div>
        </div>
      ) : (
        <div className="py-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-4">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Email Verification</h1>
          <p className="mt-2 text-xs text-gray-500 max-w-sm mx-auto">
            {error || "Enter your verification code or request a fresh link to activate your account."}
          </p>

          <form onSubmit={handleManualSubmit} className="mt-6 text-left space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Verification Token</label>
              <input
                type="text"
                required
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Paste verification token"
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-[#F84464] focus:ring-2 focus:ring-[#F84464]/20 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F84464] py-2.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60 shadow-sm transition"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify Token"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center text-xs">
            <Link href="/login" className="font-semibold text-gray-600 hover:text-gray-900">
              Sign In
            </Link>
            <Link href="/events" className="font-semibold text-[#F84464] hover:underline">
              Go to Home
            </Link>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-16 bg-gray-50 min-h-[85vh]">
      <Suspense fallback={<div className="h-96 w-full animate-pulse rounded-2xl bg-gray-200" />}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
