"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle, Download, Loader2, Mail, FileText, QrCode } from "lucide-react";
import { formatPrice } from "@/lib/format";

type BookingDetail = {
  id: number;
  reference: string;
  eventId: number;
  totalCents: number;
  quantity?: number;
  seats?: string | null;
  couponCode?: string | null;
  discountCents?: number;
  createdAt: string;
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setError("Missing checkout session");
      setLoading(false);
      return;
    }

    let url = `/api/checkout/confirm?session_id=${sessionId}`;
    const fakeEventId = searchParams.get("fake_event_id");
    const fakeUserId = searchParams.get("fake_user_id");
    const fakeSeats = searchParams.get("fake_seats");
    const fakeQuantity = searchParams.get("fake_quantity");
    const fakeCoupon = searchParams.get("fake_coupon");
    const fakeDiscount = searchParams.get("fake_discount");
    const isGuest = searchParams.get("is_guest");
    const guestEmail = searchParams.get("guest_email");
    const guestName = searchParams.get("guest_name");
    const fakeTotal = searchParams.get("fake_total");
    const fakeGateway = searchParams.get("fake_gateway");

    if (fakeEventId) url += `&fake_event_id=${fakeEventId}`;
    if (fakeUserId) url += `&fake_user_id=${fakeUserId}`;
    if (fakeSeats) url += `&fake_seats=${encodeURIComponent(fakeSeats)}`;
    if (fakeQuantity) url += `&fake_quantity=${fakeQuantity}`;
    if (fakeCoupon) url += `&fake_coupon=${encodeURIComponent(fakeCoupon)}`;
    if (fakeDiscount) url += `&fake_discount=${fakeDiscount}`;
    if (isGuest) url += `&is_guest=true&guest_email=${encodeURIComponent(guestEmail || "")}&guest_name=${encodeURIComponent(guestName || "")}`;
    if (fakeTotal) url += `&fake_total=${fakeTotal}`;
    if (fakeGateway) url += `&fake_gateway=${fakeGateway}`;

    fetch(url, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Confirmation failed");
        setBooking(data.booking);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  let parsedSeats: string[] = [];
  if (booking?.seats) {
    try {
      parsedSeats = JSON.parse(booking.seats);
    } catch {
      parsedSeats = booking.seats.split(",").map((s) => s.trim());
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-strong p-10"
    >
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          <p className="text-slate-400">Confirming your booking…</p>
        </div>
      ) : error ? (
        <div className="py-6 text-rose-300">
          <p className="font-medium">{error}</p>
          <Link href="/events" className="mt-4 inline-block text-indigo-400 hover:underline">
            Browse events
          </Link>
        </div>
      ) : booking ? (
        <>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-2xl font-bold">Booking confirmed!</h1>
          <p className="mt-2 text-slate-400">
            Your e-ticket and invoice are ready for download.
          </p>

          <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6 text-left space-y-3">
            <div>
              <p className="text-xs text-slate-400">Booking reference</p>
              <p className="mt-1 font-mono text-lg font-semibold text-indigo-300">{booking.reference}</p>
            </div>

            {parsedSeats.length > 0 && (
              <div>
                <p className="text-xs text-slate-400">Reserved Seats</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {parsedSeats.map((seat) => (
                    <span key={seat} className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-sm font-semibold text-indigo-300">
                      {seat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {booking.discountCents && booking.discountCents > 0 ? (
              <div className="flex justify-between items-center text-xs text-emerald-400 border-t border-white/5 pt-2">
                <span>Promo Applied ({booking.couponCode})</span>
                <span>-{formatPrice(booking.discountCents)}</span>
              </div>
            ) : null}

            <div className="border-t border-white/5 pt-2">
              <p className="text-xs text-slate-400">Total paid</p>
              <p className="mt-1 font-semibold text-lg text-white">{formatPrice(booking.totalCents)}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href={`/tickets/${booking.reference}`}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-3.5 text-sm font-bold shadow-lg shadow-indigo-600/30 transition text-white"
            >
              <QrCode className="h-4 w-4" /> Open Mobile Pass (QR & Barcode)
            </Link>

            <div className="grid grid-cols-2 gap-3">
              <a
                href={`/api/bookings/${booking.id}/ticket`}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-semibold hover:bg-white/10 text-slate-200 transition"
              >
                <Download className="h-4 w-4" /> e-Ticket PDF
              </a>
              <a
                href={`/api/bookings/${booking.id}/invoice`}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-semibold hover:bg-white/10 text-slate-200 transition"
              >
                <FileText className="h-4 w-4" /> Tax Invoice PDF
              </a>
            </div>

            <p className="flex items-center justify-center gap-2 text-xs text-slate-400 mt-2">
              <Mail className="h-3.5 w-3.5" /> Also sent to your registered email
            </p>
            <Link
              href="/bookings"
              className="rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-medium hover:bg-white/10 text-slate-300"
            >
              View all my tickets
            </Link>
          </div>
        </>
      ) : null}
    </motion.div>
  );
}

export default function BookingSuccessPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-20 text-center">
      <Suspense fallback={<div className="glass-strong h-96 animate-pulse" />}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
