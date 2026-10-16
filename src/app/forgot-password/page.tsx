"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [demoResetUrl, setDemoResetUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Failed to submit request.");
        return;
      }

      setSubmitted(true);
      if (data.resetUrl) {
        setDemoResetUrl(data.resetUrl);
      }
    } catch {
      setLoading(false);
      setError("An unexpected network error occurred.");
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-16 bg-gray-50 min-h-[85vh]">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
      >
        <Link
          href="/login"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>

        {!submitted ? (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[#F84464] mb-4">
              <Mail className="h-6 w-6" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
            <p className="mt-2 text-xs text-gray-500">
              Enter the email associated with your account, and we will send you a secure link to reset your password.
            </p>

            {error && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-600 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-[#F84464] focus:ring-2 focus:ring-[#F84464]/20 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F84464] py-2.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60 shadow-sm transition"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4">
              <CheckCircle2 className="h-7 w-7" />
            </div>

            <h2 className="text-xl font-bold text-gray-900">Check your inbox</h2>
            <p className="mt-2 text-xs text-gray-500">
              If an account is associated with <strong className="text-gray-800">{email}</strong>, you will receive an email with instructions shortly.
            </p>

            {demoResetUrl && (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block mb-1">
                  Demo Environment Shortcut
                </span>
                <p className="text-xs text-amber-700 mb-2">
                  Since SMTP is optional in dev, you can test the link immediately:
                </p>
                <Link
                  href={demoResetUrl}
                  className="inline-block rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition"
                >
                  Proceed to Reset Form →
                </Link>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-100">
              <Link
                href="/login"
                className="text-xs font-semibold text-[#F84464] hover:underline"
              >
                Return to Login
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
