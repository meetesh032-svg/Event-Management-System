"use client";

import { useEffect, useState } from "react";
import { Eye, Flame, Radio, Clock, CheckCircle2, Ticket } from "lucide-react";

interface LiveState {
  eventId: number;
  isLiveNow: boolean;
  isPast: boolean;
  isUpcoming: boolean;
  startsAt: string;
  endsAt: string;
  ticketsRemaining: number;
  capacity: number;
  liveViewingCount: number;
  checkedInCount: number;
  recentBookings: Array<{
    id: number;
    buyerInitial: string;
    buyerName: string;
    quantity: number;
    timeAgoMinutes: number;
  }>;
}

export function LiveEventPulse({
  eventId,
  startsAt,
  initialTicketsRemaining,
}: {
  eventId: number;
  startsAt: string;
  initialTicketsRemaining: number;
}) {
  const [liveData, setLiveData] = useState<LiveState | null>(null);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });

  // Real-time tick for countdown
  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(startsAt).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [startsAt]);

  // Fetch live state & polling every 20 seconds
  useEffect(() => {
    const fetchLiveState = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/live`);
        if (res.ok) {
          const data = await res.json();
          setLiveData(data);
        }
      } catch {
        // ignore
      }
    };

    fetchLiveState();
    const pollInterval = setInterval(fetchLiveState, 20000);
    return () => clearInterval(pollInterval);
  }, [eventId]);

  const viewers = liveData?.liveViewingCount || 7;
  const ticketsLeft = liveData ? liveData.ticketsRemaining : initialTicketsRemaining;
  const isScarcity = ticketsLeft > 0 && ticketsLeft <= 15;
  const isLive = liveData?.isLiveNow;

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-4 text-white shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Live Status Badge & Countdown */}
        <div className="flex flex-wrap items-center gap-4">
          {isLive ? (
            <div className="flex items-center gap-2 rounded-full bg-rose-500/20 px-3.5 py-1.5 border border-rose-500/40 text-rose-400 font-bold text-xs tracking-wider animate-pulse">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span>LIVE IN PROGRESS</span>
            </div>
          ) : timeLeft.isPast ? (
            <div className="flex items-center gap-2 rounded-full bg-gray-700 px-3.5 py-1.5 text-gray-300 font-bold text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>EVENT CONCLUDED</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5 animate-spin" /> Starts in:
              </span>
              <div className="flex items-center gap-1 font-mono text-xs font-bold">
                {timeLeft.days > 0 && (
                  <span className="rounded-lg bg-white/10 px-2 py-1 text-white">
                    {timeLeft.days}d
                  </span>
                )}
                <span className="rounded-lg bg-white/10 px-2 py-1 text-white">
                  {String(timeLeft.hours).padStart(2, "0")}h
                </span>
                <span>:</span>
                <span className="rounded-lg bg-white/10 px-2 py-1 text-white">
                  {String(timeLeft.minutes).padStart(2, "0")}m
                </span>
                <span>:</span>
                <span className="rounded-lg bg-[#F84464] px-2 py-1 text-white font-extrabold">
                  {String(timeLeft.seconds).padStart(2, "0")}s
                </span>
              </div>
            </div>
          )}

          {/* Scarcity indicator */}
          {isScarcity && (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-500/30">
              <Flame className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>Selling Fast: Only {ticketsLeft} tickets left!</span>
            </div>
          )}
        </div>

        {/* Right: Real-time Viewers & Attendee social proof */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-gray-300">
            <Eye className="h-4 w-4 text-indigo-400" />
            <span>
              <strong className="text-white font-bold">{viewers}</strong> people viewing
            </span>
          </div>

          {liveData?.recentBookings && liveData.recentBookings.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 border-l border-gray-700 pl-4 text-gray-400 text-[11px]">
              <Ticket className="h-3.5 w-3.5 text-emerald-400" />
              <span>
                {liveData.recentBookings[0].buyerName} booked {liveData.recentBookings[0].quantity} {liveData.recentBookings[0].quantity === 1 ? "ticket" : "tickets"} ({liveData.recentBookings[0].timeAgoMinutes}m ago)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
