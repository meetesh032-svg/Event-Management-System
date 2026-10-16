"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, ShieldCheck, KeyRound, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/events";
  const authError = searchParams.get("error");
  const { setUser } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(authError ? "Authentication failed. Please try again." : "");

  // MFA Challenge State
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload: Record<string, string> = { email, password };
    if (requiresMfa) {
      if (useBackupCode) {
        payload.backupCode = backupCode;
      } else {
        payload.mfaCode = mfaCode;
      }
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      // Check if server requests MFA step
      if (data.requiresMfa) {
        setRequiresMfa(true);
        setError("");
        return;
      }

      setUser(data.user);
      router.push(redirect);
    } catch {
      setLoading(false);
      setError("An unexpected network error occurred.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
    >
      {!requiresMfa ? (
        <>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-2 text-sm text-gray-500">
            Sign in to book tickets, explore shows, or manage your events.
          </p>

          {/* Quick Demo 1-Click Buttons */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setEmail("organizer@demo.com");
                setPassword("password123");
              }}
              className="flex-1 rounded-xl bg-gray-100 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition"
            >
              Demo Organizer
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("attendee@demo.com");
                setPassword("password123");
              }}
              className="flex-1 rounded-xl bg-gray-100 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition"
            >
              Demo Attendee
            </button>
          </div>

          {/* OAuth Social Buttons */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <a
              href="/api/auth/oauth/google"
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white py-2 px-3 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              Google
            </a>
            <a
              href="/api/auth/oauth/github"
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white py-2 px-3 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              GitHub
            </a>
          </div>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400 font-medium">Or continue with email</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-600 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-[#F84464] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F84464] py-2.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60 shadow-sm transition"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-[#F84464] hover:underline">
              Create an account
            </Link>
          </p>
        </>
      ) : (
        /* MFA Verification Step */
        <div>
          <button
            type="button"
            onClick={() => setRequiresMfa(false)}
            className="mb-4 flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to email sign in
          </button>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
            <ShieldCheck className="h-6 w-6" />
          </div>

          <h1 className="text-xl font-bold text-gray-900">Two-Factor Authentication</h1>
          <p className="mt-1 text-xs text-gray-500">
            {useBackupCode
              ? "Enter one of your 8-character emergency backup recovery codes."
              : "Enter the 6-digit verification code from your Google Authenticator or Authy app."}
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-600 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {!useBackupCode ? (
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  6-Digit Authenticator Code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    autoFocus
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-center tracking-widest font-mono text-lg text-gray-900 outline-none focus:border-[#F84464] focus:ring-2 focus:ring-[#F84464]/20"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Emergency Backup Code
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX"
                  className="w-full rounded-xl border border-gray-300 bg-white py-2.5 px-3.5 font-mono text-center tracking-wider text-sm text-gray-900 outline-none focus:border-[#F84464] focus:ring-2 focus:ring-[#F84464]/20"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F84464] py-2.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60 shadow-sm transition"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Sign in"}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setError("");
                }}
                className="text-xs font-medium text-gray-600 hover:text-gray-900 underline transition"
              >
                {useBackupCode ? "Use Authenticator app code instead" : "Lost access to phone? Use backup code"}
              </button>
            </div>
          </form>
        </div>
      )}
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-16 bg-gray-50 min-h-[85vh]">
      <Suspense fallback={<div className="h-96 w-full animate-pulse rounded-2xl bg-gray-200" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
