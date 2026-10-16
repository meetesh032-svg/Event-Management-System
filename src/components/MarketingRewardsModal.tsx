"use client";

import { useState, useEffect } from "react";
import { 
  Gift, 
  Share2, 
  Coins, 
  Crown, 
  Copy, 
  Check, 
  X, 
  ArrowRight, 
  Sparkles, 
  Wallet,
  AlertCircle
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";

export function MarketingRewardsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"referral" | "loyalty" | "giftcard">("referral");

  // Referral State
  const [referralCode, setReferralCode] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [referralsCount, setReferralsCount] = useState(0);

  // Loyalty State
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loyaltyCashValue, setLoyaltyCashValue] = useState(0);
  const [membershipTier, setMembershipTier] = useState("Bronze Member");
  const [membershipDiscount, setMembershipDiscount] = useState(0);

  // Gift Card State
  const [giftCardCode, setGiftCardCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [giftCardMsg, setGiftCardMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;

    // Fetch referral info
    fetch("/api/marketing/referrals")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setReferralCode(data.code);
          setReferralLink(data.referralLink);
          setReferralsCount(data.completedCount || 0);
        }
      })
      .catch(() => {});

    // Fetch loyalty info
    fetch("/api/marketing/loyalty")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setLoyaltyPoints(data.totalPoints || 0);
          setLoyaltyCashValue(data.monetaryValueCents || 0);
          setMembershipTier(data.membershipTier);
          setMembershipDiscount(data.membershipDiscount);
        }
      })
      .catch(() => {});
  }, [isOpen, user]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRedeemGiftCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftCardCode.trim() || redeeming) return;

    setRedeeming(true);
    setGiftCardMsg(null);
    try {
      const res = await fetch("/api/marketing/gift-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "redeem", code: giftCardCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setGiftCardMsg({ type: "success", text: data.message });
        setGiftCardCode("");
      } else {
        setGiftCardMsg({ type: "error", text: data.error || "Failed to redeem gift card" });
      }
    } catch {
      setGiftCardMsg({ type: "error", text: "Network error redeeming gift card" });
    } finally {
      setRedeeming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition">
      <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header Banner */}
        <div className="relative bg-gradient-to-r from-gray-950 via-slate-900 to-indigo-950 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-amber-300 border border-white/15">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Gatherly Rewards & Loyalty Hub</h3>
                <p className="text-xs text-gray-400">Earn discounts, invite friends, and claim gift vouchers</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 flex gap-2 border-b border-white/10 pb-0">
            <button
              onClick={() => setActiveTab("referral")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition border-b-2 ${
                activeTab === "referral"
                  ? "border-[#F84464] text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Share2 className="h-3.5 w-3.5" /> Refer & Earn ₹500
            </button>
            <button
              onClick={() => setActiveTab("loyalty")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition border-b-2 ${
                activeTab === "loyalty"
                  ? "border-[#F84464] text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Coins className="h-3.5 w-3.5" /> Points ({loyaltyPoints})
            </button>
            <button
              onClick={() => setActiveTab("giftcard")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition border-b-2 ${
                activeTab === "giftcard"
                  ? "border-[#F84464] text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Gift className="h-3.5 w-3.5" /> Gift Card
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* TAB 1: REFERRAL */}
          {activeTab === "referral" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  Invite Friends & Earn
                </span>
                <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                  Give friends ₹500 off their first booking. When they complete their first event ticket purchase, you earn ₹500 directly in your Gatherly Wallet!
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700">Your Shareable Referral Link</label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={referralLink || "Generating..."}
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs font-mono text-gray-700 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-black transition shadow-sm"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    <span>{copied ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Referral Code</span>
                  <p className="mt-0.5 text-base font-black text-gray-900 font-mono">{referralCode || "—"}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Successful Invites</span>
                  <p className="mt-0.5 text-base font-black text-indigo-600">{referralsCount}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LOYALTY POINTS & VIP TIER */}
          {activeTab === "loyalty" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-500/10 to-amber-50 p-4">
                <div>
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                    Membership Status
                  </span>
                  <h4 className="text-lg font-black text-amber-950 flex items-center gap-1.5">
                    <Crown className="h-4 w-4 text-amber-600" /> {membershipTier}
                  </h4>
                  {membershipDiscount > 0 && (
                    <p className="text-xs text-amber-700 font-medium">
                      Enjoy automatic {membershipDiscount}% OFF on all event checkout tickets!
                    </p>
                  )}
                </div>
                <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                  Active
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <span className="text-xs font-bold text-gray-500 uppercase">Points Balance</span>
                  <p className="mt-1 text-2xl font-black text-gray-900">{loyaltyPoints}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Earn 10 pts per ₹100 spent</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <span className="text-xs font-bold text-gray-500 uppercase">Redemption Value</span>
                  <p className="mt-1 text-2xl font-black text-emerald-600">{formatPrice(loyaltyCashValue)}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Auto-applies at checkout</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GIFT CARD REDEMPTION */}
          {activeTab === "giftcard" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Gift className="h-4 w-4 text-rose-500" /> Have a Gift Card?
                </h4>
                <p className="mt-1 text-xs text-gray-600">
                  Enter your 16-character code below to instantly credit the balance into your Gatherly Wallet.
                </p>

                {giftCardMsg && (
                  <div
                    className={`mt-3 p-3 rounded-xl border text-xs font-semibold ${
                      giftCardMsg.type === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}
                  >
                    {giftCardMsg.text}
                  </div>
                )}

                <form onSubmit={handleRedeemGiftCard} className="mt-4 space-y-3">
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. GATH-GIFT-8X92-2026"
                      value={giftCardCode}
                      onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-gray-900 outline-none focus:border-indigo-600"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!giftCardCode.trim() || redeeming}
                    className="w-full rounded-xl bg-[#F84464] hover:bg-rose-600 py-2.5 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
                  >
                    {redeeming ? "Claiming..." : "Redeem into Wallet"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
