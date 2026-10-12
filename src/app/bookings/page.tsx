"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Download, Loader2, MapPin } from "lucide-react";

type BookingWithEvent = {
  id: number;
  reference: string;
  status: string;
  totalCents: number;
  createdAt: string;
  event: {
    id: number;
    title: string;
    location: string;
    startsAt: string;
  };
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingWithEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bookings", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setBookings(data.bookings ?? []))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold">My Tickets</h1>
      <p className="mt-2 text-slate-400">All your confirmed bookings in one place.</p>

      {loading ? (
        <div className="mt-10 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-white/20 p-12 text-center text-slate-400">
          <p className="text-lg font-medium">No tickets yet</p>
          <Link href="/events" className="mt-4 inline-block text-indigo-400 hover:underline">
            Explore events
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {bookings.map((b, idx) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                  {b.status}
                </span>
                <h3 className="mt-2 text-lg font-semibold">{b.event.title}</h3>
                <div className="mt-1 flex flex-wrap gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> {formatDate(b.event.startsAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {b.event.location}
                  </span>
                </div>
                <p className="mt-2 font-mono text-xs text-slate-500">Ref: {b.reference}</p>
              </div>
              <div className="flex flex-col gap-2 sm:text-right">
                <p className="text-lg font-semibold text-indigo-300">${(b.totalCents / 100).toFixed(2)}</p>
                <a
                  href={`/api/bookings/${b.id}/ticket`}
                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
                >
                  <Download className="h-4 w-4" /> Download
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
