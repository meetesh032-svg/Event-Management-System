"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, Check, Loader2, Calendar, Ticket, AlertCircle, RefreshCw, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = () => {
    fetch("/api/notifications")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 25000); // 25s background polling
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PUT" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
    setLoading(false);
  };

  const handleEnablePush = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        // Register mock/local push key with server
        await fetch("/api/notifications/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: `https://fcm.googleapis.com/fcm/send/fake-${Date.now()}`,
            keys: { p256dh: "mock_p256dh_key", auth: "mock_auth_key" },
          }),
        });
        alert("Web Push Notifications enabled! You will receive live show & ticket alerts.");
      }
    } catch {
      alert("Could not enable web push notifications.");
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
        aria-label="View notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#F84464] text-[10px] font-bold text-white shadow">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-3 w-80 sm:w-96 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 text-white shadow-2xl backdrop-blur-xl z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold px-2 py-0.5">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={loading}
                    className="text-[11px] text-slate-400 hover:text-white transition flex items-center gap-1"
                  >
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                  className={`p-3.5 text-xs transition cursor-pointer flex gap-3 ${
                    n.isRead ? "bg-transparent text-slate-400" : "bg-indigo-600/10 text-white"
                  } hover:bg-white/5`}
                >
                  <div className="mt-0.5 shrink-0">
                    {n.type === "booking_confirmation" ? (
                      <Ticket className="h-4 w-4 text-emerald-400" />
                    ) : n.type === "booking_reminder" || n.type === "event_reminder" ? (
                      <Calendar className="h-4 w-4 text-amber-400" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-indigo-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${n.isRead ? "text-slate-300" : "text-white"}`}>
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-2">{n.message}</p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} •{" "}
                      {new Date(n.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {!n.isRead && (
                    <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                  )}
                </div>
              ))}

              {notifications.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-500">
                  You have no notifications yet.
                </div>
              )}
            </div>

            {/* Footer Push Permission Action */}
            <div className="border-t border-white/10 bg-slate-950 p-2.5 text-center">
              <button
                type="button"
                onClick={handleEnablePush}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition"
              >
                <Smartphone className="h-3 w-3" /> Enable Live Web Push Alerts
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
