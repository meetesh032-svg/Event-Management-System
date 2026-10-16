"use client";

import { useState } from "react";
import { Search, Download, Mail, Phone, Ticket, Armchair } from "lucide-react";
import { formatRupees } from "@/lib/format";

interface AttendeeRow {
  booking: {
    id: number;
    reference: string;
    quantity: number;
    totalCents: number;
    status: string;
    seats: string | null;
    createdAt: string;
  };
  attendee: {
    name: string;
    email: string;
    phone: string | null;
  };
}

export default function AttendeeListClient({
  eventId,
  eventTitle,
  initialRows,
}: {
  eventId: number;
  eventTitle: string;
  initialRows: AttendeeRow[];
}) {
  const [search, setSearch] = useState("");

  const filtered = initialRows.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.attendee.name.toLowerCase().includes(q) ||
      r.attendee.email.toLowerCase().includes(q) ||
      r.booking.reference.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by attendee name, email, or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900/60 pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Export Button */}
        <a
          href={`/api/events/${eventId}/attendees/export`}
          download
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition shadow-sm"
        >
          <Download className="h-4 w-4" /> Export CSV ({initialRows.length})
        </a>
      </div>

      {/* Attendees Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 shadow-xl backdrop-blur-xl">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-slate-300">
            <tr>
              <th className="px-6 py-4 font-semibold">Attendee</th>
              <th className="px-6 py-4 font-semibold">Contact</th>
              <th className="px-6 py-4 font-semibold">Booking Reference</th>
              <th className="px-6 py-4 font-semibold">Seats / Qty</th>
              <th className="px-6 py-4 font-semibold">Paid</th>
              <th className="px-6 py-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-200">
            {filtered.map((row) => {
              let parsedSeats: string[] = [];
              if (row.booking.seats) {
                try {
                  parsedSeats = JSON.parse(row.booking.seats);
                } catch {
                  parsedSeats = row.booking.seats.split(",").map((s) => s.trim());
                }
              }

              return (
                <tr key={row.booking.id} className="hover:bg-white/[0.03] transition">
                  <td className="px-6 py-4 font-medium text-white">
                    {row.attendee.name}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <a
                        href={`mailto:${row.attendee.email}`}
                        className="inline-flex items-center gap-1.5 text-xs text-indigo-300 hover:underline"
                      >
                        <Mail className="h-3 w-3" /> {row.attendee.email}
                      </a>
                      {row.attendee.phone && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                          <Phone className="h-3 w-3" /> {row.attendee.phone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-indigo-200">
                    {row.booking.reference}
                  </td>
                  <td className="px-6 py-4">
                    {parsedSeats.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {parsedSeats.map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center gap-1 rounded bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 text-[11px] font-medium text-indigo-300"
                          >
                            <Armchair className="h-2.5 w-2.5" /> {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {row.booking.quantity} {row.booking.quantity === 1 ? "ticket" : "tickets"}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-semibold text-white">
                    {formatRupees(row.booking.totalCents)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                      <Ticket className="h-3 w-3" /> {row.booking.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            {search ? `No attendees matching "${search}"` : "No bookings recorded yet."}
          </div>
        )}
      </div>
    </div>
  );
}
