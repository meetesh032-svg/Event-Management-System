"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  Users,
  MapPin,
  Calendar,
  DollarSign,
  Ticket,
  BadgeCheck,
  AlertTriangle,
  Search,
  CheckCircle2,
  XCircle,
  Star,
  Activity,
  FileText,
  Loader2,
  Lock,
  RefreshCw,
  Sliders,
} from "lucide-react";
import { formatRupees } from "@/lib/format";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  isVerifiedOrganizer: boolean;
  isEmailVerified: boolean;
  walletBalanceCents: number;
  createdAt: string;
}

interface AdminVenue {
  id: number;
  name: string;
  address: string;
  city: string;
  capacity: number;
  imageUrl: string | null;
  isApproved: boolean;
  organizerName: string | null;
  organizerEmail: string | null;
  createdAt: string;
}

interface AdminEvent {
  id: number;
  title: string;
  category: string;
  location: string;
  startsAt: string;
  capacity: number;
  ticketsRemaining: number;
  ticketPriceCents: number;
  status: string;
  isFeatured: boolean;
  organizerName: string | null;
  organizerEmail: string | null;
}

interface AdminMetrics {
  totalGmvCents: number;
  totalTicketsSold: number;
  totalBookings: number;
  totalUsers: number;
  totalOrganizers: number;
  verifiedOrganizers: number;
  unverifiedOrganizers: number;
  totalVenues: number;
  approvedVenues: number;
  pendingVenues: number;
  totalEvents: number;
  publishedEvents: number;
  featuredEvents: number;
  failedTransactions: number;
  refundedTransactions: number;
}

interface AuditLogItem {
  id: number;
  action: string;
  targetType: string;
  targetId: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  actorName: string | null;
  actorEmail: string | null;
}

interface FraudData {
  alerts: any[];
  refundHeavyUsers: any[];
  failedPayments: any[];
  highValueBookings: any[];
}

export default function AdminDashboardClient({
  metrics: initialMetrics,
  users: initialUsers,
  venues: initialVenues,
  events: initialEvents,
  fraudData: initialFraudData,
  auditLogs: initialAuditLogs,
}: {
  metrics: AdminMetrics;
  users: AdminUser[];
  venues: AdminVenue[];
  events: AdminEvent[];
  fraudData: FraudData;
  auditLogs: AuditLogItem[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "venues" | "events" | "fraud" | "audit">("overview");

  // State collections
  const [usersList, setUsersList] = useState<AdminUser[]>(initialUsers);
  const [venuesList, setVenuesList] = useState<AdminVenue[]>(initialVenues);
  const [eventsList, setEventsList] = useState<AdminEvent[]>(initialEvents);
  const [auditLogsList, setAuditLogsList] = useState<AuditLogItem[]>(initialAuditLogs);

  // Filters
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [venueFilter, setVenueFilter] = useState<"all" | "pending" | "approved">("all");
  const [eventFilter, setEventFilter] = useState<"all" | "featured" | "published" | "draft">("all");

  // Busy trackers
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [updatingVenueId, setUpdatingVenueId] = useState<number | null>(null);
  const [updatingEventId, setUpdatingEventId] = useState<number | null>(null);

  // User Actions
  const handleRoleChange = async (userId: number, newRole: string) => {
    setUpdatingUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList((prev) => prev.map((u) => (u.id === userId ? { ...u, role: data.user.role } : u)));
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update role");
      }
    } catch {
      alert("Error updating user role");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleToggleVerified = async (userId: number, current: boolean) => {
    setUpdatingUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerifiedOrganizer: !current }),
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isVerifiedOrganizer: data.user.isVerifiedOrganizer } : u))
        );
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update organizer badge");
      }
    } catch {
      alert("Error updating badge");
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Venue Approval
  const handleToggleVenueApproval = async (venueId: number, current: boolean) => {
    setUpdatingVenueId(venueId);
    try {
      const res = await fetch(`/api/admin/venues/${venueId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved: !current }),
      });
      if (res.ok) {
        const data = await res.json();
        setVenuesList((prev) =>
          prev.map((v) => (v.id === venueId ? { ...v, isApproved: data.venue.isApproved } : v))
        );
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update venue approval");
      }
    } catch {
      alert("Error updating venue approval");
    } finally {
      setUpdatingVenueId(null);
    }
  };

  // Event Moderation
  const handleToggleEventFeatured = async (eventId: number, current: boolean) => {
    setUpdatingEventId(eventId);
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !current }),
      });
      if (res.ok) {
        const data = await res.json();
        setEventsList((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, isFeatured: data.event.isFeatured } : e))
        );
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to toggle featured");
      }
    } catch {
      alert("Error updating event");
    } finally {
      setUpdatingEventId(null);
    }
  };

  const handleEventStatusChange = async (eventId: number, newStatus: string) => {
    setUpdatingEventId(eventId);
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setEventsList((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, status: data.event.status } : e))
        );
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to change status");
      }
    } catch {
      alert("Error changing status");
    } finally {
      setUpdatingEventId(null);
    }
  };

  // Filtered views
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredVenues = venuesList.filter((v) => {
    if (venueFilter === "pending") return !v.isApproved;
    if (venueFilter === "approved") return v.isApproved;
    return true;
  });

  const filteredEvents = eventsList.filter((e) => {
    if (eventFilter === "featured") return e.isFeatured;
    if (eventFilter === "published") return e.status === "published";
    if (eventFilter === "draft") return e.status === "draft";
    return true;
  });

  return (
    <div className="space-y-8">
      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-xl backdrop-blur-xl">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Platform GMV</div>
          <div className="mt-1 text-xl font-black text-white">{formatRupees(initialMetrics.totalGmvCents)}</div>
          <p className="mt-0.5 text-[10px] text-emerald-400">Gross ticket volume</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-xl backdrop-blur-xl">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total Users</div>
          <div className="mt-1 text-xl font-black text-white">{initialMetrics.totalUsers.toLocaleString()}</div>
          <p className="mt-0.5 text-[10px] text-indigo-300">Registered platform accounts</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-xl backdrop-blur-xl">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Organizers</div>
          <div className="mt-1 text-xl font-black text-white">
            {initialMetrics.totalOrganizers}{" "}
            <span className="text-xs font-normal text-slate-400">({initialMetrics.verifiedOrganizers} verified)</span>
          </div>
          <p className="mt-0.5 text-[10px] text-amber-300">{initialMetrics.unverifiedOrganizers} unverified</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-xl backdrop-blur-xl">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Venues Queue</div>
          <div className="mt-1 text-xl font-black text-white">
            {initialMetrics.pendingVenues}{" "}
            <span className="text-xs font-normal text-slate-400">pending</span>
          </div>
          <p className="mt-0.5 text-[10px] text-purple-300">{initialMetrics.approvedVenues} approved</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-xl backdrop-blur-xl">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Active Events</div>
          <div className="mt-1 text-xl font-black text-white">{initialMetrics.publishedEvents}</div>
          <p className="mt-0.5 text-[10px] text-sky-300">{initialMetrics.featuredEvents} featured on home</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-xl backdrop-blur-xl">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Fraud & Security</div>
          <div className="mt-1 text-xl font-black text-rose-400">{initialFraudData.alerts.length} Alerts</div>
          <p className="mt-0.5 text-[10px] text-rose-300">{initialMetrics.failedTransactions} payment errors</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 pb-4 overflow-x-auto gap-2">
        {[
          { id: "overview", label: "Executive Summary", icon: Activity },
          { id: "users", label: `Users & Roles (${usersList.length})`, icon: Users },
          { id: "venues", label: `Venue Approval (${venuesList.length})`, icon: MapPin },
          { id: "events", label: `Event Moderation (${eventsList.length})`, icon: Calendar },
          { id: "fraud", label: `Fraud & Risk (${initialFraudData.alerts.length})`, icon: ShieldAlert },
          { id: "audit", label: `Audit Logs (${auditLogsList.length})`, icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shrink-0 ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Audit Actions */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-400" /> Recent Administrative Activity
            </h2>
            <div className="space-y-3">
              {auditLogsList.slice(0, 6).map((log) => (
                <div key={log.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-indigo-300">{log.action}</span>
                    <span className="text-slate-400"> on </span>
                    <span className="text-white font-medium">{log.targetType} #{log.targetId}</span>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      By {log.actorName || "Admin"} • {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                    {log.targetType}
                  </span>
                </div>
              ))}
              {auditLogsList.length === 0 && (
                <p className="text-xs text-slate-500 py-6 text-center">No administrative actions logged yet.</p>
              )}
            </div>
          </div>

          {/* Pending Verifications & Approvals */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl space-y-6">
            <div>
              <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-amber-400" /> Pending Organizer Verifications
              </h2>
              <div className="space-y-2">
                {usersList
                  .filter((u) => u.role === "organizer" && !u.isVerifiedOrganizer)
                  .slice(0, 4)
                  .map((u) => (
                    <div key={u.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs">
                      <div>
                        <p className="font-semibold text-white">{u.name}</p>
                        <p className="text-[11px] text-slate-400">{u.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleVerified(u.id, false)}
                        className="rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-300 transition"
                      >
                        Grant Verified Badge
                      </button>
                    </div>
                  ))}
                {usersList.filter((u) => u.role === "organizer" && !u.isVerifiedOrganizer).length === 0 && (
                  <p className="text-xs text-slate-500 py-2">All current organizers are verified.</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-purple-400" /> Venues Awaiting Approval
              </h2>
              <div className="space-y-2">
                {venuesList
                  .filter((v) => !v.isApproved)
                  .slice(0, 3)
                  .map((v) => (
                    <div key={v.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs">
                      <div>
                        <p className="font-semibold text-white">{v.name}</p>
                        <p className="text-[11px] text-slate-400">{v.city} • Cap: {v.capacity}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleVenueApproval(v.id, false)}
                        className="rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 px-3 py-1 text-xs font-bold text-purple-200 transition"
                      >
                        Approve Venue
                      </button>
                    </div>
                  ))}
                {venuesList.filter((v) => !v.isApproved).length === 0 && (
                  <p className="text-xs text-slate-500 py-2">No venues awaiting moderation.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search user by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900/60 pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-2">
              {["all", "attendee", "organizer", "admin"].map((r) => (
                <button
                  key={r}
                  onClick={() => setUserRoleFilter(r)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition capitalize ${
                    userRoleFilter === r
                      ? "bg-indigo-600 text-white"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl backdrop-blur-xl">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/5 text-slate-300">
                <tr>
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Verified Badge</th>
                  <th className="px-6 py-4 font-semibold">Wallet</th>
                  <th className="px-6 py-4 font-semibold">Joined</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {filteredUsers.map((u) => {
                  const isBusy = updatingUserId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.03] transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          {u.name}
                          {u.isVerifiedOrganizer && (
                            <span title="Verified Organizer">
                              <BadgeCheck className="h-4 w-4 text-indigo-400" />
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </td>

                      <td className="px-6 py-4">
                        <select
                          value={u.role}
                          disabled={isBusy}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1 text-xs font-bold text-indigo-300 outline-none capitalize"
                        >
                          <option value="attendee" className="bg-slate-900 text-white">Attendee</option>
                          <option value="organizer" className="bg-slate-900 text-white">Organizer</option>
                          <option value="admin" className="bg-slate-900 text-white">Admin</option>
                        </select>
                      </td>

                      <td className="px-6 py-4">
                        {u.role === "organizer" || u.role === "admin" ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggleVerified(u.id, u.isVerifiedOrganizer)}
                            className={`rounded-full px-2.5 py-1 text-xs font-bold transition flex items-center gap-1 ${
                              u.isVerifiedOrganizer
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-slate-800 text-slate-400 hover:text-white"
                            }`}
                          >
                            <BadgeCheck className="h-3 w-3" />
                            {u.isVerifiedOrganizer ? "Verified" : "Unverified"}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 font-mono text-xs text-emerald-400 font-semibold">
                        {formatRupees(u.walletBalanceCents || 0)}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {isBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin text-indigo-400 inline" />
                        ) : (
                          <span className="text-xs text-slate-500">Active</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: VENUE APPROVAL */}
      {activeTab === "venues" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {[
              { id: "all", label: `All Venues (${venuesList.length})` },
              { id: "pending", label: `Pending Approval (${venuesList.filter((v) => !v.isApproved).length})` },
              { id: "approved", label: `Approved (${venuesList.filter((v) => v.isApproved).length})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setVenueFilter(f.id as any)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  venueFilter === f.id
                    ? "bg-indigo-600 text-white"
                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredVenues.map((v) => {
              const isBusy = updatingVenueId === v.id;
              return (
                <div
                  key={v.id}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300">
                        {v.city}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          v.isApproved
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {v.isApproved ? "Approved" : "Pending Review"}
                      </span>
                    </div>

                    <h3 className="mt-3 text-lg font-bold text-white">{v.name}</h3>
                    <p className="mt-1 text-xs text-slate-400">{v.address}</p>
                    <p className="mt-2 text-xs text-indigo-300 font-semibold">Capacity: {v.capacity.toLocaleString()} seats</p>

                    {v.organizerName && (
                      <p className="mt-2 text-[11px] text-slate-400">
                        Submitted by: <strong className="text-white">{v.organizerName}</strong>
                      </p>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleToggleVenueApproval(v.id, v.isApproved)}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        v.isApproved
                          ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg"
                      }`}
                    >
                      {isBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : v.isApproved ? (
                        <>
                          <XCircle className="h-3.5 w-3.5" /> Revoke Approval
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve Venue
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: EVENT MODERATION */}
      {activeTab === "events" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {[
              { id: "all", label: `All Events (${eventsList.length})` },
              { id: "featured", label: `Featured (${eventsList.filter((e) => e.isFeatured).length})` },
              { id: "published", label: `Published (${eventsList.filter((e) => e.status === "published").length})` },
              { id: "draft", label: `Drafts (${eventsList.filter((e) => e.status === "draft").length})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setEventFilter(f.id as any)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  eventFilter === f.id
                    ? "bg-indigo-600 text-white"
                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl backdrop-blur-xl">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/5 text-slate-300">
                <tr>
                  <th className="px-6 py-4 font-semibold">Event</th>
                  <th className="px-6 py-4 font-semibold">Organizer</th>
                  <th className="px-6 py-4 font-semibold">Price</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Featured</th>
                  <th className="px-6 py-4 font-semibold text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {filteredEvents.map((e) => {
                  const isBusy = updatingEventId === e.id;
                  return (
                    <tr key={e.id} className="hover:bg-white/[0.03] transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{e.title}</div>
                        <div className="text-xs text-slate-400">{e.category} • {e.location}</div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-xs font-medium text-white">{e.organizerName || "Organizer"}</div>
                        <div className="text-[11px] text-slate-400">{e.organizerEmail}</div>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs text-white">
                        {formatRupees(e.ticketPriceCents)}
                      </td>

                      <td className="px-6 py-4">
                        <select
                          value={e.status}
                          disabled={isBusy}
                          onChange={(ev) => handleEventStatusChange(e.id, ev.target.value)}
                          className="rounded-lg border border-white/10 bg-slate-800 px-2 py-1 text-xs font-semibold text-white outline-none"
                        >
                          <option value="published">Published</option>
                          <option value="draft">Draft</option>
                          <option value="cancelled">Suspended</option>
                        </select>
                      </td>

                      <td className="px-6 py-4">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleEventFeatured(e.id, e.isFeatured)}
                          className={`rounded-full px-2.5 py-1 text-xs font-bold transition flex items-center gap-1 ${
                            e.isFeatured
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          <Star className="h-3 w-3 fill-current" />
                          {e.isFeatured ? "Featured" : "Regular"}
                        </button>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <a
                          href={`/events/${e.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-indigo-400 hover:underline"
                        >
                          View Live
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: FRAUD & RISK */}
      {activeTab === "fraud" && (
        <div className="space-y-6">
          {/* Anomaly Alerts */}
          <div className="space-y-3">
            {initialFraudData.alerts.map((alert, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs flex items-start gap-3"
              >
                <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-rose-200">{alert.title}</span>
                    <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] uppercase font-bold text-rose-300">
                      {alert.category}
                    </span>
                  </div>
                  <p className="mt-1 text-rose-300/80">{alert.description}</p>
                </div>
              </div>
            ))}
            {initialFraudData.alerts.length === 0 && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center text-xs text-emerald-300">
                ✓ No critical fraud or excessive refund anomalies detected. System operating under normal parameters.
              </div>
            )}
          </div>

          {/* Refund-Heavy Accounts */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white mb-4">Refund Activity by User</h3>
            <div className="divide-y divide-white/5 text-xs">
              {initialFraudData.refundHeavyUsers.map((u) => (
                <div key={u.userId} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white">{u.userName}</span>{" "}
                    <span className="text-slate-400">({u.userEmail})</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-amber-400 font-bold">{u.refundCount} refunds</span>
                    <span className="font-mono text-slate-300">{formatRupees(u.totalRefundedCents)}</span>
                  </div>
                </div>
              ))}
              {initialFraudData.refundHeavyUsers.length === 0 && (
                <p className="text-slate-500 py-3">No recorded refunds.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT LOGS */}
      {activeTab === "audit" && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl backdrop-blur-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-slate-300">
              <tr>
                <th className="px-6 py-4 font-semibold">Timestamp</th>
                <th className="px-6 py-4 font-semibold">Action</th>
                <th className="px-6 py-4 font-semibold">Target</th>
                <th className="px-6 py-4 font-semibold">Actor</th>
                <th className="px-6 py-4 font-semibold">Payload / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200 text-xs">
              {auditLogsList.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.03] transition">
                  <td className="px-6 py-3 font-mono text-slate-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-3">
                    <span className="rounded bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 font-bold text-indigo-300">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-mono text-slate-300">
                    {log.targetType} #{log.targetId}
                  </td>
                  <td className="px-6 py-3">
                    <span className="font-semibold text-white">{log.actorName || "Admin"}</span>
                    <span className="text-slate-400 block text-[11px]">{log.actorEmail}</span>
                  </td>
                  <td className="px-6 py-3 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                    {log.details || "—"}
                  </td>
                </tr>
              ))}
              {auditLogsList.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No audit logs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
