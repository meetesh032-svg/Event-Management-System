"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Clock,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Check,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import { SeatInfo, SeatMapResponse } from "@/lib/seat-service";

interface SeatPickerModalProps {
  eventId: number;
  eventTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onCheckout: (seatNumbers: string[]) => void;
}

export default function SeatPickerModal({
  eventId,
  eventTitle,
  isOpen,
  onClose,
  onCheckout,
}: SeatPickerModalProps) {
  const [loading, setLoading] = useState(true);
  const [mapData, setMapData] = useState<SeatMapResponse | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [heldSeats, setHeldSeats] = useState<string[]>([]);
  const [heldUntil, setHeldUntil] = useState<Date | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);
  const [holding, setHolding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch real-time seat availability
  const loadSeatMap = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`/api/events/${eventId}/seats`, {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load seats");
      }
      const data: SeatMapResponse = await res.json();
      setMapData(data);

      // Detect if current user already has active holds
      const myActiveHolds = data.seats
        .filter((s) => s.status === "my_hold")
        .map((s) => s.seatNumber);

      if (myActiveHolds.length > 0) {
        setHeldSeats(myActiveHolds);
        setSelectedSeats(myActiveHolds);
        // Find earliest heldUntil
        const holdTimes = data.seats
          .filter((s) => s.status === "my_hold" && s.heldUntil)
          .map((s) => new Date(s.heldUntil!).getTime());
        if (holdTimes.length > 0) {
          const earliest = new Date(Math.min(...holdTimes));
          setHeldUntil(earliest);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading seats");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      loadSeatMap();
    } else {
      setSelectedSeats([]);
      setHeldSeats([]);
      setHeldUntil(null);
      setTimeLeftSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isOpen, loadSeatMap]);

  // 2. Real-time Hold Timer Countdown
  useEffect(() => {
    if (!heldUntil) {
      setTimeLeftSeconds(0);
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((heldUntil.getTime() - now) / 1000));
      setTimeLeftSeconds(diff);

      if (diff === 0) {
        // Automatic release on expiration
        setError("Seat hold expired. Please reselect your seats.");
        setHeldSeats([]);
        setSelectedSeats([]);
        setHeldUntil(null);
        loadSeatMap();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    timerRef.current = interval;

    return () => clearInterval(interval);
  }, [heldUntil, loadSeatMap]);

  // Handle seat click
  const toggleSeat = (seat: SeatInfo) => {
    if (seat.status === "booked" || (seat.status === "held" && !seat.heldByMe)) {
      return; // Unavailable
    }

    setError(null);
    const isSelected = selectedSeats.includes(seat.seatNumber);

    if (isSelected) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seat.seatNumber));
    } else {
      if (selectedSeats.length >= 8) {
        setError("Maximum 8 seats can be selected at a time.");
        return;
      }
      setSelectedSeats([...selectedSeats, seat.seatNumber]);
    }
  };

  // 3. Lock & Hold Selected Seats (10 minutes)
  const handleLockSeats = async () => {
    if (selectedSeats.length === 0) return;
    setHolding(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/seats/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          seatNumbers: selectedSeats,
          durationMinutes: 10,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to hold seats");
      }

      setHeldSeats(data.heldSeats);
      setHeldUntil(new Date(data.heldUntil));
      await loadSeatMap();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error locking seats");
      await loadSeatMap();
    } finally {
      setHolding(false);
    }
  };

  // 4. Release Held Seats
  const handleReleaseSeats = async () => {
    if (heldSeats.length === 0) return;
    setHolding(true);
    try {
      await fetch(`/api/events/${eventId}/seats/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ seatNumbers: heldSeats }),
      });
      setHeldSeats([]);
      setSelectedSeats([]);
      setHeldUntil(null);
      await loadSeatMap();
    } catch (err) {
      console.error("Release error:", err);
    } finally {
      setHolding(false);
    }
  };

  // Calculate pricing for currently selected seats
  const selectedSeatObjects = (mapData?.seats || []).filter((s) =>
    selectedSeats.includes(s.seatNumber)
  );
  const totalPriceCents = selectedSeatObjects.reduce(
    (acc, s) => acc + s.priceCents,
    0
  );

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl rounded-2xl border border-white/10 bg-slate-900 shadow-2xl text-white flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-900/90">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Select Your Seats</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                Real-Time
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{eventTitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLoading(true);
                loadSeatMap();
              }}
              title="Refresh availability"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Live Hold Timer Notification Banner */}
        <AnimatePresence>
          {heldSeats.length > 0 && timeLeftSeconds > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`px-6 py-2.5 flex items-center justify-between border-b ${
                timeLeftSeconds < 120
                  ? "bg-rose-950/50 border-rose-500/40 text-rose-200"
                  : "bg-amber-950/40 border-amber-500/30 text-amber-200"
              }`}
            >
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 animate-pulse" />
                <span>
                  <strong>{heldSeats.length} seat(s) held for you.</strong> Complete booking before hold expires:
                </span>
                <span className="font-mono font-bold text-base bg-white/10 px-2 py-0.5 rounded">
                  {formatTimer(timeLeftSeconds)}
                </span>
              </div>
              <button
                onClick={handleReleaseSeats}
                disabled={holding}
                className="text-xs underline hover:text-white text-slate-300"
              >
                Release Seats
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Seat Map Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              <p className="text-sm">Loading auditorium layout and real-time locks…</p>
            </div>
          ) : mapData ? (
            <div className="flex flex-col items-center">
              {/* Stage / Screen Visualizer */}
              <div className="w-full max-w-lg mb-8 flex flex-col items-center">
                <div className="w-3/4 h-2.5 rounded-t-full bg-gradient-to-r from-indigo-500 via-rose-500 to-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
                <p className="text-[11px] font-semibold tracking-widest uppercase text-slate-400 mt-2">
                  STAGE / SCREEN
                </p>
              </div>

              {/* Grid of Seats */}
              <div className="overflow-x-auto pb-4 max-w-full">
                <div className="inline-flex flex-col gap-2.5 min-w-max p-2">
                  {Array.from({ length: mapData.rows }).map((_, rIdx) => {
                    const rowChar = String.fromCharCode(65 + rIdx);
                    const rowSeats = mapData.seats.filter((s) => s.row === rowChar);

                    return (
                      <div key={rowChar} className="flex items-center gap-2">
                        {/* Row letter badge */}
                        <span className="w-6 text-center text-xs font-mono font-bold text-slate-400">
                          {rowChar}
                        </span>

                        {/* Row seats */}
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          {rowSeats.map((seat) => {
                            const isSelected = selectedSeats.includes(seat.seatNumber);
                            const isHeldByMe = heldSeats.includes(seat.seatNumber) || seat.heldByMe;
                            const isBooked = seat.status === "booked";
                            const isHeldByOther = seat.status === "held" && !isHeldByMe;

                            // Dynamic style based on status and tier
                            let colorClasses = "bg-slate-800 text-slate-300 border-slate-700 hover:border-indigo-400 hover:bg-slate-700";

                            if (seat.tier === "vip") {
                              colorClasses = "bg-amber-500/10 text-amber-300 border-amber-500/40 hover:bg-amber-500/20";
                            } else if (seat.tier === "premium") {
                              colorClasses = "bg-purple-500/10 text-purple-300 border-purple-500/40 hover:bg-purple-500/20";
                            } else if (seat.tier === "accessible") {
                              colorClasses = "bg-emerald-500/10 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/20";
                            }

                            if (isSelected || isHeldByMe) {
                              colorClasses = "bg-indigo-600 text-white border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.6)] scale-105 font-bold";
                            } else if (isBooked) {
                              colorClasses = "bg-slate-900/40 text-slate-600 border-slate-800 cursor-not-allowed line-through";
                            } else if (isHeldByOther) {
                              colorClasses = "bg-rose-950/30 text-rose-400/60 border-rose-900/40 cursor-not-allowed";
                            }

                            return (
                              <button
                                key={seat.seatNumber}
                                disabled={isBooked || isHeldByOther}
                                onClick={() => toggleSeat(seat)}
                                title={`${seat.seatNumber} (${seat.tier.toUpperCase()}) - ${formatPrice(seat.priceCents)}${isBooked ? " (Booked)" : isHeldByOther ? " (Locked by another user)" : ""}`}
                                className={`h-8 w-8 sm:h-9 sm:w-9 rounded-lg border text-[11px] font-mono flex items-center justify-center transition-all ${colorClasses}`}
                              >
                                {isSelected ? (
                                  <Check className="h-3.5 w-3.5" />
                                ) : (
                                  seat.col
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Right Row letter */}
                        <span className="w-6 text-center text-xs font-mono font-bold text-slate-400">
                          {rowChar}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300 border-t border-white/5 pt-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded border border-slate-700 bg-slate-800" />
                  <span>Standard ({formatPrice(mapData.basePriceCents)})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded border border-purple-500/40 bg-purple-500/20" />
                  <span>Premium (+25%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded border border-amber-500/40 bg-amber-500/20" />
                  <span>VIP (+50%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded border border-emerald-500/40 bg-emerald-500/20" />
                  <span>Accessible</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded border border-indigo-400 bg-indigo-600 shadow-sm" />
                  <span>Selected</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded border border-slate-800 bg-slate-900/60 line-through text-slate-600" />
                  <span>Booked / Locked</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer with Selection Summary and Actions */}
        <div className="border-t border-white/10 bg-slate-900/95 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Selected Seats:</span>
              {selectedSeats.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedSeats.map((seat) => (
                    <span
                      key={seat}
                      className="rounded bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 text-xs font-mono font-bold text-indigo-300"
                    >
                      {seat}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-500">None selected</span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Total: <strong className="text-base text-white">{formatPrice(totalPriceCents)}</strong> for {selectedSeats.length} ticket(s)
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {heldSeats.length === 0 ? (
              <button
                onClick={handleLockSeats}
                disabled={selectedSeats.length === 0 || holding}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {holding ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Locking...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" /> Lock & Hold (10m)
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => onCheckout(selectedSeats)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/30 transition"
              >
                <Sparkles className="h-4 w-4" /> Proceed to Checkout
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
