"use client";

import { useEffect, useState } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Ticket, 
  DollarSign, 
  Clock, 
  Flame, 
  Download, 
  Layers, 
  Percent,
  ArrowUpRight,
  ShieldCheck,
  Calendar
} from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";

interface PeakHour {
  hour: number;
  label: string;
  count: number;
  revenueCents: number;
}

interface PopularEvent {
  id: number;
  title: string;
  category: string;
  capacity: number;
  ticketsRemaining: number;
  ticketsSold: number;
  revenueCents: number;
  occupancyRate: number;
}

interface AnalyticsData {
  summary: {
    totalRevenueCents: number;
    totalTicketsSold: number;
    totalBookings: number;
    confirmedBookings: number;
    cancelledBookings: number;
    conversionRate: number;
  };
  peakHours: PeakHour[];
  categoryBreakdown: Array<{
    category: string;
    ticketsSold: number;
    revenueCents: number;
    eventCount: number;
  }>;
  popularEvents: PopularEvent[];
  userMetrics: {
    totalUsers: number;
    organizersCount: number;
    verifiedOrganizers: number;
  };
}

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json) setData(json);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Revenue", formatPrice(data.summary.totalRevenueCents)],
      ["Tickets Sold", data.summary.totalTicketsSold.toString()],
      ["Conversion Rate", `${data.summary.conversionRate}%`],
      ["Total Bookings", data.summary.totalBookings.toString()],
      [],
      ["Event ID", "Title", "Category", "Tickets Sold", "Revenue", "Occupancy"],
      ...data.popularEvents.map((e) => [
        e.id.toString(),
        `"${e.title.replace(/"/g, '""')}"`,
        e.category,
        e.ticketsSold.toString(),
        formatPrice(e.revenueCents),
        `${e.occupancyRate}%`,
      ]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gatherly_analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-semibold text-gray-600">Generating analytics metrics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-base font-bold text-gray-800">Access Restricted</p>
          <p className="text-xs text-gray-500 mt-1">Please log in as an organizer or administrator.</p>
        </div>
      </div>
    );
  }

  const maxHourCount = Math.max(...data.peakHours.map((h) => h.count), 1);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-8 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
              <BarChart3 className="h-4 w-4" />
              <span>Intelligence & Telemetry</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-gray-900">
              Executive Analytics & Insights
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Real-time platform revenue velocity, peak booking hours, and conversion funnel.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
            >
              <Download className="h-4 w-4 text-gray-500" />
              <span>Export CSV Report</span>
            </button>
            <Link
              href="/dashboard"
              className="rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-black transition shadow-sm"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Gross Revenue</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-black text-gray-900">
              {formatPrice(data.summary.totalRevenueCents)}
            </p>
            <div className="mt-2 flex items-center text-xs font-semibold text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5 mr-1" />
              <span>All confirmed bookings</span>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Tickets Issued</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Ticket className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-black text-gray-900">
              {data.summary.totalTicketsSold.toLocaleString()}
            </p>
            <div className="mt-2 flex items-center text-xs font-semibold text-indigo-600">
              <Layers className="h-3.5 w-3.5 mr-1" />
              <span>Across all categories</span>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Conversion Rate</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Percent className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-black text-gray-900">
              {data.summary.conversionRate}%
            </p>
            <div className="mt-2 text-xs font-medium text-gray-500">
              {data.summary.confirmedBookings} of {data.summary.totalBookings} checkouts completed
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">User Network</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-black text-gray-900">
              {data.userMetrics.totalUsers.toLocaleString()}
            </p>
            <div className="mt-2 flex items-center text-xs font-semibold text-amber-700">
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
              <span>{data.userMetrics.organizersCount} organizers ({data.userMetrics.verifiedOrganizers} verified)</span>
            </div>
          </div>
        </div>

        {/* Peak Booking Hours Distribution (24h histogram) */}
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-600" />
                Peak Booking Hours Distribution
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Identifies optimal announcement windows based on when attendees purchase tickets (24-hour cycle).
              </p>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              UTC Timezone
            </span>
          </div>

          {/* Histogram Bars */}
          <div className="mt-6 flex h-48 items-end gap-1.5 sm:gap-2 pt-6">
            {data.peakHours.map((h) => {
              const heightPct = Math.max(6, Math.round((h.count / maxHourCount) * 100));
              const isPeak = h.count === maxHourCount && h.count > 0;
              return (
                <div key={h.hour} className="group relative flex flex-1 flex-col items-center h-full justify-end">
                  {/* Tooltip */}
                  <div className="absolute -top-10 z-10 hidden whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1 text-[11px] font-bold text-white shadow-md group-hover:block">
                    {h.label}: {h.count} tickets ({formatPrice(h.revenueCents)})
                  </div>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-md transition-all ${
                      isPeak
                        ? "bg-gradient-to-t from-rose-500 to-rose-400"
                        : "bg-indigo-500 hover:bg-indigo-600"
                    }`}
                  />
                  <span className="mt-2 text-[10px] text-gray-400 font-mono hidden sm:inline">
                    {h.hour % 3 === 0 ? `${h.hour}h` : ""}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-100 pt-3">
            <span>00:00 (Midnight)</span>
            <span>12:00 (Noon)</span>
            <span>23:00 (Night)</span>
          </div>
        </div>

        {/* Category Breakdown & Most Popular Events */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Category Breakdown */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-600" />
              Revenue by Category
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Distribution of ticket sales across entertainment verticals.</p>

            <div className="mt-6 space-y-4">
              {data.categoryBreakdown.map((cat) => {
                const totalRev = data.summary.totalRevenueCents || 1;
                const pct = Math.round((cat.revenueCents / totalRev) * 100);
                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-gray-800">{cat.category}</span>
                      <span className="text-gray-900">{formatPrice(cat.revenueCents)} ({pct}%)</span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full rounded-full bg-indigo-600"
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400">
                      <span>{cat.eventCount} {cat.eventCount === 1 ? "Event" : "Events"}</span>
                      <span>{cat.ticketsSold} tickets sold</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Most Popular Events */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Flame className="h-5 w-5 text-rose-500" />
                  Top Grossing Events
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Highest ticket volume and revenue generation.</p>
              </div>
            </div>

            <div className="mt-6 divide-y divide-gray-100">
              {data.popularEvents.map((evt, idx) => (
                <div key={evt.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-extrabold text-gray-600">
                      {idx + 1}
                    </span>
                    <div>
                      <Link
                        href={`/events/${evt.id}`}
                        className="text-xs font-bold text-gray-900 hover:text-indigo-600 transition flex items-center gap-1"
                      >
                        {evt.title}
                        <ArrowUpRight className="h-3 w-3 text-gray-400" />
                      </Link>
                      <span className="text-[11px] text-gray-400">{evt.category} • {evt.occupancyRate}% Sold</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-900">{formatPrice(evt.revenueCents)}</span>
                    <p className="text-[11px] text-gray-500">{evt.ticketsSold} tickets</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
