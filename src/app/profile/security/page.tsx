"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield,
  ShieldCheck,
  Smartphone,
  Laptop,
  LogOut,
  Mail,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";

type SessionItem = {
  id: number;
  deviceInfo: string;
  ipAddress: string;
  lastActive: string;
  createdAt: string;
  isCurrentSession: boolean;
};

export default function SecuritySettingsPage() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);

  // Email verification state
  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const [demoVerifyUrl, setDemoVerifyUrl] = useState<string | null>(null);

  // Sessions state
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionActionLoading, setSessionActionLoading] = useState(false);

  // MFA state
  const [mfaSetupStep, setMfaSetupStep] = useState<"idle" | "qr" | "disable">("idle");
  const [mfaQrData, setMfaQrData] = useState<{
    secret: string;
    qrCodeDataUrl: string;
    backupCodes: string[];
  } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState("");
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Load user sessions and current state
  const loadSessions = async () => {
    try {
      const res = await fetch("/api/auth/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // Resend Email Verification Link
  const handleResendVerification = async () => {
    setResendingEmail(true);
    setEmailMsg("");
    setDemoVerifyUrl(null);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json();
      if (data.verificationUrl) {
        setDemoVerifyUrl(data.verificationUrl);
      }
      setEmailMsg(data.message || "Verification link generated");
    } catch {
      setEmailMsg("Failed to generate verification link.");
    } finally {
      setResendingEmail(false);
    }
  };

  // Start MFA Setup
  const handleStartMfaSetup = async () => {
    setMfaLoading(true);
    setMfaError("");
    try {
      const res = await fetch("/api/auth/mfa/setup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMfaQrData(data);
        setMfaSetupStep("qr");
      } else {
        setMfaError(data.error || "Failed to initialize 2FA");
      }
    } catch {
      setMfaError("Network error initializing 2FA");
    } finally {
      setMfaLoading(false);
    }
  };

  // Confirm MFA Code
  const handleConfirmMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaQrData) return;
    setMfaLoading(true);
    setMfaError("");

    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: mfaQrData.secret,
          code: verifyCode,
          backupCodes: mfaQrData.backupCodes,
        }),
      });

      const data = await res.json();
      setMfaLoading(false);

      if (!res.ok) {
        setMfaError(data.error || "Verification failed");
        return;
      }

      if (user) {
        setUser({ ...user, mfaEnabled: true });
      }
      setMfaSetupStep("idle");
      setMfaQrData(null);
      setVerifyCode("");
    } catch {
      setMfaLoading(false);
      setMfaError("Network error verifying code.");
    }
  };

  // Disable MFA
  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaLoading(true);
    setMfaError("");

    try {
      const res = await fetch("/api/auth/mfa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });

      const data = await res.json();
      setMfaLoading(false);

      if (!res.ok) {
        setMfaError(data.error || "Failed to disable 2FA");
        return;
      }

      if (user) {
        setUser({ ...user, mfaEnabled: false });
      }
      setMfaSetupStep("idle");
      setDisablePassword("");
    } catch {
      setMfaLoading(false);
      setMfaError("Network error disabling 2FA.");
    }
  };

  // Revoke other sessions
  const handleRevokeAllOthers = async () => {
    setSessionActionLoading(true);
    try {
      await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revokeAllOthers: true }),
      });
      loadSessions();
    } catch {
      // ignore
    } finally {
      setSessionActionLoading(false);
    }
  };

  if (!user && !loading) {
    return (
      <div className="mx-auto max-w-xl py-24 text-center px-6">
        <h2 className="text-xl font-bold text-gray-900">Sign In Required</h2>
        <p className="mt-2 text-xs text-gray-500">
          Please sign in to view and manage your account security settings.
        </p>
        <Link
          href="/login?redirect=/profile/security"
          className="mt-6 inline-block rounded-xl bg-[#F84464] px-6 py-2.5 text-xs font-semibold text-white hover:bg-rose-600 transition"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Security & Device Settings</h1>
        <p className="mt-1 text-xs text-gray-500">
          Manage two-factor authentication, active login sessions, and email verification.
        </p>
      </div>

      <div className="space-y-6">
        {/* 1. Email Verification Status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Email Verification</h3>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>

            {user?.isEmailVerified ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Check className="h-3.5 w-3.5" /> Verified
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" /> Unverified
                </span>
                <button
                  onClick={handleResendVerification}
                  disabled={resendingEmail}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  {resendingEmail ? "Generating..." : "Verify Now"}
                </button>
              </div>
            )}
          </div>

          {emailMsg && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
              <p>{emailMsg}</p>
              {demoVerifyUrl && (
                <div className="mt-2">
                  <Link
                    href={demoVerifyUrl}
                    className="inline-block rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition"
                  >
                    Click to Verify Instantly →
                  </Link>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* 2. Two-Factor Authentication (2FA) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  user?.mfaEnabled ? "bg-emerald-50 text-emerald-600" : "bg-purple-50 text-purple-600"
                }`}
              >
                {user?.mfaEnabled ? <ShieldCheck className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Two-Factor Authentication (TOTP)</h3>
                <p className="text-xs text-gray-500">
                  Protect your account with Google Authenticator, Authy, or compatible apps.
                </p>
              </div>
            </div>

            <div>
              {user?.mfaEnabled ? (
                <button
                  onClick={() => setMfaSetupStep(mfaSetupStep === "disable" ? "idle" : "disable")}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                >
                  {mfaSetupStep === "disable" ? "Cancel" : "Disable 2FA"}
                </button>
              ) : (
                <button
                  onClick={handleStartMfaSetup}
                  disabled={mfaLoading || mfaSetupStep === "qr"}
                  className="rounded-xl bg-[#F84464] px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 shadow-sm transition"
                >
                  {mfaLoading ? "Loading..." : "Enable 2FA"}
                </button>
              )}
            </div>
          </div>

          {/* MFA Setup Step: QR Code & Codes */}
          {mfaSetupStep === "qr" && mfaQrData && (
            <div className="mt-6 border-t border-gray-100 pt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3">
                Step 1: Scan QR Code with Authenticator
              </h4>

              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="p-3 bg-white border border-gray-200 rounded-2xl shadow-sm">
                  <Image
                    src={mfaQrData.qrCodeDataUrl}
                    alt="2FA QR Code"
                    width={160}
                    height={160}
                    unoptimized
                    className="rounded-lg"
                  />
                </div>

                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">
                      Manual Secret Key (if camera scanning unavailable):
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="rounded-lg bg-gray-100 px-3 py-1.5 font-mono text-xs font-bold text-gray-800 tracking-wider">
                        {mfaQrData.secret}
                      </code>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-600">
                        Emergency Backup Recovery Codes:
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(mfaQrData.backupCodes.join("\n"));
                          setCopiedCodes(true);
                          setTimeout(() => setCopiedCodes(false), 2000);
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-[#F84464] hover:underline"
                      >
                        {copiedCodes ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedCodes ? "Copied!" : "Copy all"}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 max-w-sm">
                      {mfaQrData.backupCodes.map((code) => (
                        <span
                          key={code}
                          className="rounded-md bg-gray-50 border border-gray-200 px-2 py-1 font-mono text-[11px] text-gray-700 text-center font-semibold"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {mfaError && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-600 font-medium">
                  {mfaError}
                </div>
              )}

              {/* Step 2: Verify Code Form */}
              <form onSubmit={handleConfirmMfa} className="mt-6 flex flex-wrap items-end gap-3 max-w-md">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Enter 6-digit code from app to confirm:
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-center font-mono tracking-widest text-base font-bold outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={mfaLoading || verifyCode.length !== 6}
                  className="rounded-xl bg-[#F84464] px-5 py-2 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-50 transition"
                >
                  {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => setMfaSetupStep("idle")}
                  className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}

          {/* MFA Disable Form */}
          {mfaSetupStep === "disable" && (
            <form onSubmit={handleDisableMfa} className="mt-6 border-t border-gray-100 pt-6 max-w-md">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Enter your account password to confirm 2FA deactivation:
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="password"
                  required
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2 text-xs outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
                />
                <button
                  type="submit"
                  disabled={mfaLoading || !disablePassword}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition"
                >
                  {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Disable"}
                </button>
              </div>
              {mfaError && (
                <p className="mt-2 text-xs text-rose-600 font-medium">{mfaError}</p>
              )}
            </form>
          )}
        </motion.div>

        {/* 3. Session & Device Management */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Laptop className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Active Login Sessions</h3>
                <p className="text-xs text-gray-500">
                  Devices currently signed into your Gatherly account.
                </p>
              </div>
            </div>

            {sessions.filter((s) => !s.isCurrentSession).length > 0 && (
              <button
                onClick={handleRevokeAllOthers}
                disabled={sessionActionLoading}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out all other devices
              </button>
            )}
          </div>

          <div className="divide-y divide-gray-100">
            {sessions.map((sess) => (
              <div key={sess.id} className="py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-gray-400">
                    {/iphone|android|mobile/i.test(sess.deviceInfo) ? (
                      <Smartphone className="h-5 w-5" />
                    ) : (
                      <Laptop className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-800">{sess.deviceInfo}</span>
                      {sess.isCurrentSession && (
                        <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                          Current Device
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400">
                      IP: {sess.ipAddress} • Last active:{" "}
                      {new Date(sess.lastActive).toLocaleDateString()} at{" "}
                      {new Date(sess.lastActive).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>

                {!sess.isCurrentSession && (
                  <button
                    onClick={async () => {
                      await fetch("/api/auth/sessions", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ sessionToken: sess.id }),
                      });
                      loadSessions();
                    }}
                    className="text-xs font-semibold text-rose-600 hover:underline"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
