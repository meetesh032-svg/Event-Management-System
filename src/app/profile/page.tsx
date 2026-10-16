"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  User as UserIcon,
  CheckCircle,
  CreditCard,
  Heart,
  Shield,
  Globe,
  Loader2,
  Trash2,
  Plus,
  Phone,
  Edit3,
  Armchair,
  Calendar,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { formatPrice } from "@/lib/format";

type ProfileData = {
  id: number;
  name: string;
  email: string;
  role: "attendee" | "organizer" | "admin";
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  isVerifiedOrganizer: boolean;
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    github?: string;
    website?: string;
  };
  walletBalanceCents: number;
  createdAt: string;
};

type PaymentMethodItem = {
  id: number;
  type: "card" | "upi";
  cardBrand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  upiId: string | null;
  isDefault: boolean;
};

type SeatHistoryItem = {
  id: number;
  seatNumber: string;
  tier: string;
  priceCents: number;
  status: string;
  heldUntil: string | null;
  createdAt: string;
  event: {
    id: number;
    title: string;
    startsAt: string;
    location: string;
  };
};

export default function ProfilePage() {
  const { user: authUser, setUser: setAuthUser } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([]);
  const [seatHistory, setSeatHistory] = useState<SeatHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<"profile" | "payment" | "seats">("profile");

  // Edit states
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [twitter, setTwitter] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [instagram, setInstagram] = useState("");
  const [github, setGithub] = useState("");
  const [website, setWebsite] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Payment form states
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentType, setPaymentType] = useState<"card" | "upi">("card");
  const [cardBrand, setCardBrand] = useState("Visa");
  const [last4, setLast4] = useState("");
  const [expMonth, setExpMonth] = useState("12");
  const [expYear, setExpYear] = useState("2028");
  const [upiId, setUpiId] = useState("");
  const [isDefault, setIsDefault] = useState(true);
  const [savingPayment, setSavingPayment] = useState(false);

  // Load profile & payment methods
  useEffect(() => {
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          const u: ProfileData = data.user;
          setProfile(u);
          setName(u.name || "");
          setAvatarUrl(u.avatarUrl || "");
          setBio(u.bio || "");
          setPhone(u.phone || "");
          setTwitter(u.socialLinks?.twitter || "");
          setLinkedin(u.socialLinks?.linkedin || "");
          setInstagram(u.socialLinks?.instagram || "");
          setGithub(u.socialLinks?.github || "");
          setWebsite(u.socialLinks?.website || "");
        }
      })
      .catch(() => {});

    fetch("/api/payment-methods")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.paymentMethods) {
          setPaymentMethods(data.paymentMethods);
        }
      })
      .catch(() => {});

    fetch("/api/seats/history")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.history) {
          setSeatHistory(data.history);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          avatarUrl,
          bio,
          phone,
          socialLinks: { twitter, linkedin, instagram, github, website },
        }),
      });

      const data = await res.json();
      setSaving(false);

      if (!res.ok) {
        setSaveError(data.error || "Failed to update profile");
        return;
      }

      setProfile(data.user);
      if (authUser) {
        setAuthUser({
          ...authUser,
          name: data.user.name,
          avatarUrl: data.user.avatarUrl,
        });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaving(false);
      setSaveError("Network error while updating profile.");
    }
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPayment(true);

    try {
      const res = await fetch("/api/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: paymentType,
          cardBrand: paymentType === "card" ? cardBrand : null,
          last4: paymentType === "card" ? last4 : null,
          expMonth: paymentType === "card" ? parseInt(expMonth, 10) : null,
          expYear: paymentType === "card" ? parseInt(expYear, 10) : null,
          upiId: paymentType === "upi" ? upiId : null,
          isDefault,
        }),
      });

      const data = await res.json();
      setSavingPayment(false);

      if (res.ok) {
        setShowAddPayment(false);
        setLast4("");
        setUpiId("");
        // Reload list
        const refreshed = await fetch("/api/payment-methods").then((r) => r.json());
        setPaymentMethods(refreshed.paymentMethods || []);
      }
    } catch {
      setSavingPayment(false);
    }
  };

  const handleDeletePaymentMethod = async (id: number) => {
    await fetch("/api/payment-methods", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setPaymentMethods(paymentMethods.filter((p) => p.id !== id));
  };

  const handleSetDefaultPayment = async (id: number) => {
    await fetch("/api/payment-methods", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setPaymentMethods(
      paymentMethods.map((p) => ({
        ...p,
        isDefault: p.id === id,
      }))
    );
  };

  if (!authUser) {
    return (
      <div className="mx-auto max-w-xl py-24 text-center px-6">
        <h2 className="text-xl font-bold text-gray-900">Sign In Required</h2>
        <p className="mt-2 text-xs text-gray-500">Please sign in to view your profile.</p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-xl bg-[#F84464] px-6 py-2.5 text-xs font-semibold text-white hover:bg-rose-600 transition"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* Header Banner */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm mb-6 flex flex-col md:flex-row items-center md:items-start gap-6 justify-between">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-[#F84464] bg-slate-100 flex items-center justify-center shrink-0">
            {profile?.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.name}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <UserIcon className="h-10 w-10 text-gray-400" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <h1 className="text-2xl font-black text-gray-900">{profile?.name || authUser.name}</h1>
              {profile?.isVerifiedOrganizer && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                  <CheckCircle className="h-3.5 w-3.5 fill-blue-600 text-white" /> Verified Organizer
                </span>
              )}
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                {profile?.role || authUser.role}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{profile?.email || authUser.email}</p>
            {profile?.bio && <p className="text-xs text-gray-700 mt-2 max-w-lg">{profile.bio}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {profile && (
            <Link
              href={`/profile/${profile.id}`}
              className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              View Public Profile
            </Link>
          )}
          <Link
            href="/profile/security"
            className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            <Shield className="h-3.5 w-3.5" /> Security
          </Link>
          <Link
            href="/wishlist"
            className="flex items-center gap-1.5 rounded-xl bg-[#F84464] px-4 py-2 text-xs font-semibold text-white hover:bg-rose-600 shadow-sm transition"
          >
            <Heart className="h-3.5 w-3.5" /> Wishlist
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200 mb-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("profile")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "profile"
              ? "border-[#F84464] text-[#F84464]"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Profile Details & Socials
        </button>
        <button
          onClick={() => setActiveTab("payment")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "payment"
              ? "border-[#F84464] text-[#F84464]"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Saved Payment Methods ({paymentMethods.length})
        </button>
        <button
          onClick={() => setActiveTab("seats")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "seats"
              ? "border-[#F84464] text-[#F84464]"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Seat Reservations ({seatHistory.length})
        </button>
      </div>

      {/* Tab 1: Profile Details Form */}
      {activeTab === "profile" && (
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onSubmit={handleSaveProfile}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-5"
        >
          {saveSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700">
              Profile updated successfully!
            </div>
          )}
          {saveError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700">
              {saveError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Avatar Image URL</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-gray-300 pl-9 pr-3.5 py-2 text-xs outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Website URL</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://mywebsite.com"
                  className="w-full rounded-xl border border-gray-300 pl-9 pr-3.5 py-2 text-xs outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Bio / About</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other attendees and hosts about yourself..."
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
            />
          </div>

          <div className="pt-2 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-900 mb-3">Social Profiles</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-500 font-bold text-xs">𝕏</span>
                <input
                  type="text"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="@twitter_handle"
                  className="w-full rounded-xl border border-gray-300 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-[#F84464]"
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 font-bold text-xs">in</span>
                <input
                  type="text"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="linkedin_id"
                  className="w-full rounded-xl border border-gray-300 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-[#F84464]"
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-600 font-bold text-xs">ig</span>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@instagram"
                  className="w-full rounded-xl border border-gray-300 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-[#F84464]"
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-800 font-bold text-xs">git</span>
                <input
                  type="text"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  placeholder="github_username"
                  className="w-full rounded-xl border border-gray-300 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-[#F84464]"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#F84464] px-6 py-2.5 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-50 shadow-sm transition"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </button>
          </div>
        </motion.form>
      )}

      {/* Tab 2: Saved Payment Methods */}
      {activeTab === "payment" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Your Cards & Wallets</h3>
            <button
              onClick={() => setShowAddPayment(!showAddPayment)}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Add Payment Method
            </button>
          </div>

          {/* Add Payment Modal / Form */}
          {showAddPayment && (
            <form
              onSubmit={handleAddPaymentMethod}
              className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm space-y-4"
            >
              <h4 className="text-xs font-bold text-gray-900">Add New Payment Instrument</h4>

              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="payType"
                    checked={paymentType === "card"}
                    onChange={() => setPaymentType("card")}
                  />
                  Credit / Debit Card
                </label>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="payType"
                    checked={paymentType === "upi"}
                    onChange={() => setPaymentType("upi")}
                  />
                  UPI ID (VPA)
                </label>
              </div>

              {paymentType === "card" ? (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Card Network</label>
                    <select
                      value={cardBrand}
                      onChange={(e) => setCardBrand(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-xs outline-none"
                    >
                      <option value="Visa">Visa</option>
                      <option value="Mastercard">Mastercard</option>
                      <option value="RuPay">RuPay</option>
                      <option value="Amex">Amex</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Last 4 Digits</label>
                    <input
                      type="text"
                      maxLength={4}
                      required
                      value={last4}
                      onChange={(e) => setLast4(e.target.value.replace(/\D/g, ""))}
                      placeholder="4242"
                      className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Expiry Month</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      required
                      value={expMonth}
                      onChange={(e) => setExpMonth(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Expiry Year</label>
                    <input
                      type="number"
                      min={2025}
                      max={2035}
                      required
                      value={expYear}
                      onChange={(e) => setExpYear(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-xs outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">UPI ID</label>
                  <input
                    type="text"
                    required
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="username@okhdfcbank"
                    className="w-full max-w-sm rounded-xl border border-gray-300 px-3 py-1.5 text-xs outline-none"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="defaultCheck"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                <label htmlFor="defaultCheck" className="text-xs text-gray-600 cursor-pointer">
                  Set as default payment method for fast checkout
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="rounded-xl bg-[#F84464] px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 transition"
                >
                  {savingPayment ? "Saving..." : "Save Method"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPayment(false)}
                  className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* List of Saved Payment Methods */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm divide-y divide-gray-100">
            {paymentMethods.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">
                No saved payment methods yet. Add one above for instant 1-click checkout!
              </p>
            ) : (
              paymentMethods.map((pm) => (
                <div key={pm.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">
                          {pm.type === "card"
                            ? `${pm.cardBrand} •••• ${pm.last4}`
                            : `UPI: ${pm.upiId}`}
                        </span>
                        {pm.isDefault && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Default
                          </span>
                        )}
                      </div>
                      {pm.type === "card" && (
                        <p className="text-[11px] text-gray-400">
                          Expires {pm.expMonth}/{pm.expYear}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {!pm.isDefault && (
                      <button
                        onClick={() => handleSetDefaultPayment(pm.id)}
                        className="text-xs font-semibold text-gray-600 hover:text-[#F84464] transition"
                      >
                        Set as Default
                      </button>
                    )}
                    <button
                      onClick={() => handleDeletePaymentMethod(pm.id)}
                      className="text-gray-400 hover:text-rose-600 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* Tab 3: Seat Reservations History */}
      {activeTab === "seats" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Seat Reservation History</h3>
              <p className="text-xs text-gray-500">
                Track your active seat holds, booked auditorium passes, and release history.
              </p>
            </div>
            <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-700">
              {seatHistory.length} Reservations
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {seatHistory.length === 0 ? (
              <div className="py-12 text-center">
                <Armchair className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                <p className="text-sm font-semibold text-gray-700">No seat reservations yet</p>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  When you select specific auditorium seats for an event, your holds and bookings will be listed here.
                </p>
                <Link
                  href="/events"
                  className="mt-4 inline-block rounded-xl bg-[#F84464] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-600 transition"
                >
                  Browse Events
                </Link>
              </div>
            ) : (
              seatHistory.map((res) => (
                <div key={res.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 font-mono font-bold text-sm">
                      {res.seatNumber}
                    </div>
                    <div>
                      <Link
                        href={`/events/${res.event.id}`}
                        className="text-sm font-bold text-gray-900 hover:text-[#F84464] transition line-clamp-1"
                      >
                        {res.event.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                        <span className="capitalize px-2 py-0.5 rounded bg-gray-100 font-medium text-gray-700">
                          {res.tier} Tier
                        </span>
                        <span>•</span>
                        <span>{formatPrice(res.priceCents)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(res.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        res.status === "booked"
                          ? "bg-emerald-100 text-emerald-800"
                          : res.status === "held"
                          ? "bg-amber-100 text-amber-800 animate-pulse"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {res.status === "booked" ? "Confirmed" : res.status === "held" ? "Hold Active" : "Released"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
