"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusCircle,
  Users,
  Copy,
  Edit,
  TrendingUp,
  DollarSign,
  Ticket,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  FileEdit,
  Loader2,
  Trash2,
  Eye,
} from "lucide-react";
import { formatRupees } from "@/lib/format";

interface DashboardEvent {
  id: number;
  title: string;
  category: string;
  status: string;
  startsAt: string;
  capacity: number;
  ticketsRemaining: number;
  bookingsCount: number;
  ticketsSold: number;
  revenueCents: number;
  occupancyRate: number;
}

interface RecentBooking {
  id: number;
  reference: string;
  quantity: number;
  totalCents: number;
  status: string;
  createdAt: string;
  eventTitle: string;
  attendeeName: string;
  attendeeEmail: string;
}

interface Summary {
  totalRevenueCents: number;
  totalTicketsSold: number;
  totalEvents: number;
  publishedCount: number;
  draftCount: number;
  scheduledCount: number;
  overallOccupancy: number;
}

export default function OrganizerDashboardClient({
  summary,
  events: initialEvents,
  recentBookings,
}: {
  summary: Summary;
  events: DashboardEvent[];
  recentBookings: RecentBooking[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "published" | "draft" | "scheduled">("all");
  const [cloningId, setCloningId] = useState<number | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const filteredEvents = initialEvents.filter((e) => {
    if (activeTab === "all") return true;
    return e.status === activeTab;
  });

  const handleClone = async (id: number) => {
    setCloningId(id);
    try {
      const res = await fetch(`/api/events/${id}/clone`, { method: "POST" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to clone event");
      }
    } catch {
      alert("Error cloning event");
    } finally {
      setCloningId(null);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    setUpdatingStatusId(id);
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update status");
      }
    } catch {
      alert("Error updating event status");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this event? This action cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete event");
      }
    } catch {
      alert("Error deleting event");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Total Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {formatRupees(summary.totalRevenueCents)}
          </div>
          <p className="mt-1 text-[11px] text-emerald-400">Across all ticket sales</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Tickets Sold</span>
            <Ticket className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {summary.totalTicketsSold.toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-indigo-300">Total booked attendees</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Occupancy Rate</span>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">{summary.overallOccupancy}%</div>
          <p className="mt-1 text-[11px] text-amber-300">Average venue utilization</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Active Shows</span>
            <Layers className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {summary.publishedCount}{" "}
            <span className="text-xs font-normal text-slate-400">/ {summary.totalEvents}</span>
          </div>
          <p className="mt-1 text-[11px] text-purple-300">
            {summary.draftCount} draft{summary.draftCount !== 1 ? "s" : ""} • {summary.scheduledCount} scheduled
          </p>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex gap-2">
          {[
            { id: "all", label: `All Events (${initialEvents.length})` },
            { id: "published", label: `Published (${summary.publishedCount})` },
            { id: "draft", label: `Drafts (${summary.draftCount})` },
            { id: "scheduled", label: `Scheduled (${summary.scheduledCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/venues/new"
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
          >
            Manage Venues
          </Link>
          <Link
            href="/dashboard/events/new"
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white transition shadow-md shadow-indigo-600/30"
          >
            <PlusCircle className="h-3.5 w-3.5" /> Create Event
          </Link>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredEvents.map((event) => {
          const isCloning = cloningId === event.id;
          const isUpdating = updatingStatusId === event.id;
          const isDeleting = deletingId === event.id;

          return (
            <motion.div
              key={event.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl transition hover:border-indigo-500/30"
            >
              <div>
                {/* Top badges */}
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300 border border-white/10">
                    {event.category}
                  </span>

                  {/* Status Badge & Toggle */}
                  <div className="relative">
                    <select
                      value={event.status}
                      disabled={isUpdating}
                      onChange={(e) => handleStatusChange(event.id, e.target.value)}
                      className={`cursor-pointer appearance-none rounded-full px-3 py-0.5 text-[11px] font-bold outline-none transition pr-6 ${
                        event.status === "published"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : event.status === "scheduled"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-slate-700/60 text-slate-300 border border-slate-600"
                      }`}
                    >
                      <option value="published" className="bg-slate-900 text-white">Published</option>
                      <option value="draft" className="bg-slate-900 text-white">Draft</option>
                      <option value="scheduled" className="bg-slate-900 text-white">Scheduled</option>
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                      ▼
                    </span>
                  </div>
                </div>

                <h3 className="mt-4 text-lg font-bold text-white line-clamp-1">{event.title}</h3>
                <p className="mt-1 text-xs text-slate-400 font-medium">
                  {new Date(event.startsAt).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>

                {/* Sales & Occupancy Progress */}
                <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-3.5 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Tickets Booked</span>
                    <span className="font-bold text-white">
                      {event.ticketsSold} / {event.capacity} ({event.occupancyRate}%)
                    </span>
                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-rose-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, event.occupancyRate)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs pt-1 border-t border-white/5 text-slate-300">
                    <span className="text-[11px] text-slate-400">Gross Sales:</span>
                    <span className="font-semibold text-emerald-400">
                      {formatRupees(event.revenueCents)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <Link
                    href={`/dashboard/events/${event.id}/attendees`}
                    className="flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 transition"
                  >
                    <Users className="h-3.5 w-3.5 text-indigo-400" /> Attendees ({event.bookingsCount})
                  </Link>

                  <Link
                    href={`/dashboard/events/${event.id}/scanner`}
                    className="flex items-center justify-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition shadow-sm"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Gate Scanner
                  </Link>

                  <Link
                    href={`/dashboard/events/${event.id}/edit`}
                    className="flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 transition"
                  >
                    <Edit className="h-3.5 w-3.5 text-amber-400" /> Edit Show
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Link
                    href={`/events/${event.id}`}
                    target="_blank"
                    className="flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-white/10 transition"
                  >
                    <Eye className="h-3 w-3 text-sky-400" /> Preview
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleClone(event.id)}
                    disabled={isCloning}
                    className="flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-white/10 transition disabled:opacity-50"
                  >
                    {isCloning ? (
                      <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                    ) : (
                      <Copy className="h-3 w-3 text-indigo-400" />
                    )}
                    Clone
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(event.id)}
                    disabled={isDeleting}
                    className="flex items-center justify-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 py-1.5 text-[11px] font-medium text-rose-300 hover:bg-rose-500/20 transition disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3 w-3 animate-spin text-rose-400" />
                    ) : (
                      <Trash2 className="h-3 w-3 text-rose-400" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredEvents.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-12 text-center text-slate-400">
          <Ticket className="mx-auto mb-3 h-10 w-10 text-slate-500" />
          <p className="text-lg font-bold text-white">No events found</p>
          <p className="mt-1 text-xs">
            {activeTab === "all"
              ? "Create your first event to start ticketing and tracking sales."
              : `You have no ${activeTab} events right now.`}
          </p>
        </div>
      )}

      {/* Recent Bookings Activity Feed */}
      {recentBookings.length > 0 && (
        <div className="mt-10 rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-400" /> Recent Ticket Sales Activity
          </h2>
          <div className="divide-y divide-white/5">
            {recentBookings.map((b) => (
              <div key={b.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-white">{b.attendeeName}</span>{" "}
                  <span className="text-slate-400">purchased</span>{" "}
                  <span className="font-medium text-indigo-300">{b.quantity}x ticket{b.quantity > 1 ? "s" : ""}</span>{" "}
                  <span className="text-slate-400">for</span>{" "}
                  <span className="text-slate-200 font-medium">{b.eventTitle}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-emerald-400 font-bold">{formatRupees(b.totalCents)}</span>
                  <span className="text-slate-500 text-[11px]">
                    {new Date(b.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
