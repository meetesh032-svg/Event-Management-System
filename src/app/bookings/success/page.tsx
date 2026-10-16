"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Download,
  Loader2,
  Mail,
  FileText,
  QrCode,
  Calendar,
  Share2,
  Ticket,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  MapPin,
  Receipt,
} from "lucide-react";
import { formatRupees } from "@/lib/format";
import { Button, Badge, Card } from "@/components/ui";

type BookingDetail = {
  id: number;
  reference: string;
  eventId: number;
  totalCents: number;
  quantity?: number;
  seats?: string | null;
  couponCode?: string | null;
  discountCents?: number;
  stripeSessionId?: string;
  createdAt: string;
  event?: {
    id: number;
    title: string;
    location: string;
    startsAt: string;
    imageUrl?: string | null;
    category?: string;
  };
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const bookingRef = searchParams.get("booking_ref");
  const gateway = searchParams.get("gateway");
  const cfOrderId = searchParams.get("cf_order_id");
  const transactionId = searchParams.get("transactionId");
  const token = searchParams.get("token");
  const txnid = searchParams.get("txnid");
  const encResp = searchParams.get("encResp");

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    const identifier = bookingRef || sessionId || cfOrderId || transactionId || token || txnid;
    if (!identifier) {
      setError("Missing payment confirmation or booking session identifier.");
      setLoading(false);
      return;
    }

    // Build query for verification & confirmation
    const params = new URLSearchParams();
    if (sessionId) params.set("session_id", sessionId);
    if (bookingRef) params.set("booking_ref", bookingRef);
    if (gateway) params.set("gateway", gateway);
    if (cfOrderId) params.set("cf_order_id", cfOrderId);
    if (transactionId) params.set("transactionId", transactionId);
    if (token) params.set("token", token);
    if (txnid) params.set("txnid", txnid);
    if (encResp) params.set("encResp", encResp);

    const url = `/api/checkout/confirm?${params.toString()}`;

    fetch(url, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Payment verification failed");
        setBooking(data.booking);

        // Fetch event details for preview card
        if (data.booking?.eventId) {
          fetch(`/api/events/${data.booking.eventId}`)
            .then((r) => r.json())
            .then((evtData) => {
              if (evtData?.event) {
                setBooking((prev) => (prev ? { ...prev, event: evtData.event } : null));
              }
            })
            .catch(() => {});
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId, bookingRef, gateway, cfOrderId, transactionId, token, txnid, encResp]);

  let parsedSeats: string[] = [];
  if (booking?.seats) {
    try {
      parsedSeats = JSON.parse(booking.seats);
    } catch {
      parsedSeats = booking.seats.split(",").map((s) => s.trim());
    }
  }

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/tickets/${booking?.reference}`;
    if (navigator.share) {
      navigator.share({
        title: "My Gatherly Ticket",
        text: `Check out my confirmed booking: ${booking?.reference}`,
        url: shareUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  const handleAddToCalendar = () => {
    if (!booking?.event) return;
    const title = encodeURIComponent(booking.event.title);
    const details = encodeURIComponent(`Booking Reference: ${booking.reference}\nLocation: ${booking.event.location}`);
    const location = encodeURIComponent(booking.event.location);
    const startDate = new Date(booking.event.startsAt).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${startDate}/${startDate}`;
    window.open(googleCalendarUrl, "_blank");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-16">
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-gray-200 shadow-sm">
          <Loader2 className="h-10 w-10 animate-spin text-[#F84464] mb-4" />
          <h3 className="text-lg font-bold text-gray-900">Verifying Official Payment</h3>
          <p className="mt-1 text-xs text-gray-500">Generating digital QR tickets, tax invoice & payment receipt...</p>
        </div>
      ) : error ? (
        <div className="p-8 bg-white rounded-3xl border border-gray-200 shadow-sm text-center">
          <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="h-6 w-6 text-rose-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Payment Verification Issue</h3>
          <p className="mt-1 text-xs text-gray-500">{error}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/bookings">
              <Button variant="primary" size="sm">Go to My Bookings</Button>
            </Link>
          </div>
        </div>
      ) : booking ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-10 shadow-xl overflow-hidden"
        >
          {/* Top Success Badge Animation */}
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-inner mb-4">
              <CheckCircle className="h-10 w-10" />
            </div>
            <span className="rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-700 uppercase tracking-wider inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Official Payment Verified
            </span>
            <h1 className="mt-3 text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              You&apos;re All Set for the Show!
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              Your official digital ticket pass, tax invoice, and payment receipt have been generated.
            </p>
          </div>

          {/* Event Snapshot Card */}
          {booking.event && (
            <div className="mt-8 rounded-2xl border border-gray-100 bg-[#F8F9FA] p-4 sm:p-5 flex items-center gap-4">
              <div
                className="relative h-20 w-16 shrink-0 rounded-xl bg-gray-200 bg-cover bg-center overflow-hidden border border-gray-200"
                style={{ backgroundImage: `url(${booking.event.imageUrl || "/placeholder-event.jpg"})` }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-[#F84464] uppercase tracking-wider">
                  {booking.event.category || "Show"}
                </span>
                <h3 className="text-base font-bold text-gray-900 truncate mt-0.5">
                  {booking.event.title}
                </h3>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  {booking.event.location}
                </p>
                <p className="text-xs text-gray-600 font-semibold mt-1">
                  {new Date(booking.event.startsAt).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          )}

          {/* Booking Summary Box */}
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
            <div className="flex justify-between items-center text-xs pb-3 border-b border-gray-100">
              <span className="text-gray-500 font-medium">Booking Reference</span>
              <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2.5 py-0.5 rounded-lg text-xs">
                {booking.reference}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">Tickets / Seats</span>
              <span className="font-bold text-gray-900">
                {booking.quantity || parsedSeats.length || 1} Ticket(s)
                {parsedSeats.length > 0 && ` (${parsedSeats.join(", ")})`}
              </span>
            </div>

            {booking.discountCents ? (
              <div className="flex justify-between items-center text-xs text-emerald-600 font-medium">
                <span>Discount ({booking.couponCode || "Promo"})</span>
                <span>- {formatRupees(booking.discountCents)}</span>
              </div>
            ) : null}

            <div className="flex justify-between items-center text-sm pt-3 border-t border-gray-100">
              <span className="font-bold text-gray-900">Total Paid (Incl. Taxes)</span>
              <span className="font-extrabold text-emerald-600 text-base">
                {formatRupees(booking.totalCents)}
              </span>
            </div>
          </div>

          {/* Primary Action Buttons: QR Pass + e-Ticket PDF + Tax Invoice + Receipt */}
          <div className="mt-8 space-y-3">
            <Link
              href={`/tickets/${booking.reference}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F84464] hover:bg-[#E03252] py-3.5 px-6 text-sm font-bold text-white shadow-lg shadow-[#F84464]/20 transition-all"
            >
              <QrCode className="h-4 w-4" /> Open Fullscreen QR Ticket Pass
            </Link>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <a
                href={`/api/bookings/${booking.id}/ticket`}
                download
                className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 py-2.5 text-xs font-bold text-gray-700 shadow-sm transition"
              >
                <Download className="h-3.5 w-3.5 text-gray-500" /> e-Ticket PDF
              </a>
              <a
                href={`/api/bookings/${booking.id}/invoice`}
                download
                className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 py-2.5 text-xs font-bold text-gray-700 shadow-sm transition"
              >
                <FileText className="h-3.5 w-3.5 text-gray-500" /> Tax Invoice
              </a>
              <a
                href={`/api/bookings/${booking.id}/receipt`}
                download
                className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 py-2.5 text-xs font-bold text-gray-700 shadow-sm transition"
              >
                <Receipt className="h-3.5 w-3.5 text-gray-500" /> Receipt PDF
              </a>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleAddToCalendar}
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 py-2.5 text-xs font-semibold text-gray-700 transition"
              >
                <Calendar className="h-4 w-4 text-gray-500" /> Add to Calendar
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 py-2.5 text-xs font-semibold text-gray-700 transition"
              >
                <Share2 className="h-4 w-4 text-gray-500" />
                <span>{copiedShare ? "Link Copied!" : "Share Ticket"}</span>
              </button>
            </div>
          </div>

          {/* Email Confirmation Notice */}
          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
              <Mail className="h-3.5 w-3.5 text-emerald-600" />
              <span>Confirmation email sent with PDF passes, tax invoice, and payment receipt.</span>
            </p>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
          <Loader2 className="h-8 w-8 animate-spin text-[#F84464]" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
