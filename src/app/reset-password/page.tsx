"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Reset failed. The link may have expired.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/events");
      }, 2000);
    } catch {
      setLoading(false);
      setError("An unexpected network error occurred.");
    }
  };

  if (!token) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Missing Reset Token</h2>
        <p className="mt-2 text-xs text-gray-500">
          This password reset link is invalid or incomplete.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block rounded-xl bg-[#F84464] px-5 py-2 text-xs font-semibold text-white hover:bg-rose-600 transition"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
    >
      {!success ? (
        <>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
            <KeyRound className="h-6 w-6" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900">Create new password</h1>
          <p className="mt-1 text-xs text-gray-500">
            Please enter and confirm your new secure password.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-600 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900 outline-none focus:border-[#F84464] focus:ring-2 focus:ring-[#F84464]/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Confirm New Password</label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-[#F84464] focus:ring-2 focus:ring-[#F84464]/20 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F84464] py-2.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60 shadow-sm transition"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password & Sign In"}
            </button>
          </form>
        </>
      ) : (
        <div className="text-center py-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Password Updated!</h2>
          <p className="mt-2 text-xs text-gray-500">
            Your password has been changed successfully. Redirecting you to the platform...
          </p>
        </div>
      )}
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-16 bg-gray-50 min-h-[85vh]">
      <Suspense fallback={<div className="h-96 w-full animate-pulse rounded-2xl bg-gray-200" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
