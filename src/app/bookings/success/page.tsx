"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle, Download, Loader2, Mail } from "lucide-react";
import { formatPrice } from "@/lib/format";

type BookingDetail = {
  id: number;
  reference: string;
  eventId: number;
  totalCents: number;
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
    if (fakeEventId) url += `&fake_event_id=${fakeEventId}`;
    if (fakeUserId) url += `&fake_user_id=${fakeUserId}`;

    fetch(url, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Confirmation failed");
        setBooking(data.booking);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

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
            Your e-ticket has been emailed to you and is ready for download.
          </p>

          <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6 text-left">
            <p className="text-xs text-slate-400">Booking reference</p>
            <p className="mt-1 font-mono text-lg font-semibold text-indigo-300">{booking.reference}</p>
            <p className="mt-4 text-xs text-slate-400">Total paid</p>
            <p className="mt-1 font-semibold">{formatPrice(booking.totalCents)}</p>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <a
              href={`/api/bookings/${booking.id}/ticket`}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold hover:bg-indigo-500"
            >
              <Download className="h-4 w-4" /> Download e-Ticket
            </a>
            <p className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Mail className="h-3.5 w-3.5" /> Also sent to your registered email
            </p>
            <Link
              href="/bookings"
              className="rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium hover:bg-white/10"
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
