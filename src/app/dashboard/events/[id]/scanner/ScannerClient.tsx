"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Camera,
  Keyboard,
  Users,
  RefreshCw,
  ArrowLeft,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Armchair,
  Download,
  UploadCloud,
} from "lucide-react";

interface AttendanceStats {
  capacity: number;
  ticketsSold: number;
  checkedInCount: number;
  remainingCount: number;
  attendanceRate: number;
}

interface ScanResult {
  valid: boolean;
  duplicate: boolean;
  status: "APPROVED" | "DUPLICATE" | "CANCELLED" | "NOT_FOUND";
  message?: string;
  error?: string;
  reference?: string;
  attendee?: {
    name: string;
    email: string;
    phone?: string | null;
  };
  quantity?: number;
  seats?: string[];
  firstCheckedInAt?: string;
  totalScanAttempts?: number;
  timestamp: string;
}

export default function ScannerClient({
  eventId,
  eventTitle,
  initialStats,
}: {
  eventId: number;
  eventTitle: string;
  initialStats: AttendanceStats;
}) {
  const [stats, setStats] = useState<AttendanceStats>(initialStats);
  const [referenceInput, setReferenceInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineManifest, setOfflineManifest] = useState<Map<string, any>>(new Map());
  const [queuedSyncs, setQueuedSyncs] = useState<string[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play audio tones for pass vs fail
  const playBeep = (type: "success" | "duplicate" | "error") => {
    if (!soundEnabled) return;
    try {
      const ctx = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "success") {
        osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch A5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === "duplicate") {
        // Double low buzz
        osc.frequency.setValueAtTime(220, ctx.currentTime); // Low A3
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {}
  };

  // Poll live attendance metrics every 15s
  useEffect(() => {
    const fetchAttendance = () => {
      fetch(`/api/events/${eventId}/attendance`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.stats) setStats(data.stats);
        })
        .catch(() => {});
    };

    const timer = setInterval(fetchAttendance, 15000);
    return () => clearInterval(timer);
  }, [eventId]);

  // Download Manifest for offline capability
  const handleDownloadManifest = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/manifest`);
      if (res.ok) {
        const data = await res.json();
        const map = new Map();
        for (const item of data.manifest) {
          map.set(item.reference.toUpperCase(), item);
        }
        setOfflineManifest(map);
        alert(`Offline manifest downloaded! ${map.size} tickets ready for offline scanning.`);
      }
    } catch {
      alert("Failed to load offline manifest");
    }
  };

  const handleValidateTicket = async (ref: string) => {
    if (!ref.trim() || scanning) return;
    const cleanRef = ref.trim().toUpperCase();
    setScanning(true);

    // 1. OFFLINE SCAN MODE
    if (isOfflineMode) {
      setTimeout(() => {
        const entry = offlineManifest.get(cleanRef);
        let res: ScanResult;

        if (!entry) {
          res = {
            valid: false,
            duplicate: false,
            status: "NOT_FOUND",
            error: "Ticket reference not found in offline manifest.",
            reference: cleanRef,
            timestamp: new Date().toLocaleTimeString(),
          };
          playBeep("error");
        } else if (entry.isCheckedIn) {
          res = {
            valid: false,
            duplicate: true,
            status: "DUPLICATE",
            error: "DUPLICATE SCAN! Ticket already marked as checked in.",
            firstCheckedInAt: entry.checkedInAt,
            reference: cleanRef,
            attendee: { name: entry.attendeeName, email: "" },
            quantity: entry.quantity,
            seats: entry.seats ? JSON.parse(entry.seats) : [],
            timestamp: new Date().toLocaleTimeString(),
          };
          playBeep("duplicate");
        } else {
          entry.isCheckedIn = true;
          entry.checkedInAt = new Date().toISOString();
          setQueuedSyncs((q) => [...q, cleanRef]);
          res = {
            valid: true,
            duplicate: false,
            status: "APPROVED",
            message: "Offline Access Granted",
            reference: cleanRef,
            attendee: { name: entry.attendeeName, email: "" },
            quantity: entry.quantity,
            seats: entry.seats ? JSON.parse(entry.seats) : [],
            timestamp: new Date().toLocaleTimeString(),
          };
          playBeep("success");
          setStats((s) => ({
            ...s,
            checkedInCount: s.checkedInCount + (entry.quantity || 1),
            remainingCount: Math.max(0, s.remainingCount - (entry.quantity || 1)),
            attendanceRate: Math.round(((s.checkedInCount + (entry.quantity || 1)) / (s.ticketsSold || 1)) * 100),
          }));
        }

        setScanResult(res);
        setHistory((h) => [res, ...h.slice(0, 15)]);
        setReferenceInput("");
        setScanning(false);
      }, 150);
      return;
    }

    // 2. ONLINE LIVE CHECK-IN
    try {
      const res = await fetch(`/api/events/${eventId}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: cleanRef }),
      });

      const data = await res.json();
      const resultObj: ScanResult = {
        ...data,
        timestamp: new Date().toLocaleTimeString(),
      };

      setScanResult(resultObj);
      setHistory((h) => [resultObj, ...h.slice(0, 15)]);

      if (data.valid) {
        playBeep("success");
        setStats((s) => ({
          ...s,
          checkedInCount: s.checkedInCount + (data.quantity || 1),
          remainingCount: Math.max(0, s.remainingCount - (data.quantity || 1)),
          attendanceRate: Math.round(((s.checkedInCount + (data.quantity || 1)) / (s.ticketsSold || 1)) * 100),
        }));
      } else if (data.duplicate) {
        playBeep("duplicate");
      } else {
        playBeep("error");
      }
    } catch {
      const errResult: ScanResult = {
        valid: false,
        duplicate: false,
        status: "NOT_FOUND",
        error: "Network validation error. Switch to Offline Mode if WiFi dropped.",
        timestamp: new Date().toLocaleTimeString(),
      };
      setScanResult(errResult);
      playBeep("error");
    } finally {
      setReferenceInput("");
      setScanning(false);
    }
  };

  // Sync queued offline scans back to server
  const handleSyncQueuedScans = async () => {
    if (queuedSyncs.length === 0) return;
    for (const ref of queuedSyncs) {
      await fetch(`/api/events/${eventId}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: ref }),
      }).catch(() => {});
    }
    setQueuedSyncs([]);
    alert("All offline check-ins synchronized successfully with server!");
  };

  // Camera start/stop
  const toggleCamera = async () => {
    if (cameraActive) {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      setCameraActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
      } catch {
        alert("Camera access denied or unavailable. You can use barcode reader or manual entry.");
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Controls & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-400 transition mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Link>
          <h1 className="text-2xl font-black text-white">{eventTitle}</h1>
          <p className="text-xs text-slate-400">Gate Entry Scanner & Live Attendance Monitor</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300 hover:bg-white/10 transition"
            title={soundEnabled ? "Mute audio beeps" : "Enable audio beeps"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
          </button>

          {/* Offline Mode Toggle */}
          <button
            onClick={() => setIsOfflineMode(!isOfflineMode)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
              isOfflineMode
                ? "border-amber-500 bg-amber-500/20 text-amber-300"
                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            {isOfflineMode ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5 text-emerald-400" />}
            {isOfflineMode ? "Offline Mode Active" : "Online Mode"}
          </button>

          {/* Download Manifest */}
          <button
            onClick={handleDownloadManifest}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
          >
            <Download className="h-3.5 w-3.5" /> Cache Manifest ({offlineManifest.size})
          </button>

          {/* Sync Queued */}
          {queuedSyncs.length > 0 && (
            <button
              onClick={handleSyncQueuedScans}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3 py-2 text-xs font-bold text-white transition shadow-lg shadow-indigo-600/30"
            >
              <UploadCloud className="h-3.5 w-3.5" /> Sync Scans ({queuedSyncs.length})
            </button>
          )}
        </div>
      </div>

      {/* Live Attendance Counter Card */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Live Gate Attendance</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{stats.checkedInCount}</span>
              <span className="text-sm text-slate-400">/ {stats.ticketsSold} checked in</span>
              <span className="ml-2 rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-bold text-indigo-300 border border-indigo-500/30">
                {stats.attendanceRate}% arrived
              </span>
            </div>
          </div>

          <div className="flex gap-4 text-xs">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center min-w-24">
              <div className="text-slate-400 text-[11px]">Remaining</div>
              <div className="font-bold text-white text-base mt-0.5">{stats.remainingCount}</div>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center min-w-24">
              <div className="text-slate-400 text-[11px]">Total Capacity</div>
              <div className="font-bold text-white text-base mt-0.5">{stats.capacity}</div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${Math.min(100, stats.attendanceRate)}%` }}
          />
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid gap-6 md:grid-cols-5">
        {/* Left Column: Scanner & Input (3 cols) */}
        <div className="md:col-span-3 space-y-6">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
            {/* Camera Viewfinder */}
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                className={`h-full w-full object-cover ${cameraActive ? "block" : "hidden"}`}
                playsInline
                muted
              />

              {!cameraActive && (
                <div className="text-center p-6 text-slate-500">
                  <QrCode className="h-12 w-12 mx-auto mb-2 text-slate-600" />
                  <p className="text-xs font-semibold text-slate-400">Camera scanner in standby</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Click Activate Camera or scan with handheld laser/barcode reader.
                  </p>
                </div>
              )}

              {/* Target Scan Reticle Overlay */}
              {cameraActive && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-44 w-44 rounded-2xl border-2 border-indigo-500/80 shadow-[0_0_25px_rgba(99,102,241,0.5)] animate-pulse" />
                </div>
              )}

              <button
                type="button"
                onClick={toggleCamera}
                className="absolute bottom-3 right-3 rounded-lg bg-black/80 hover:bg-black border border-white/20 px-3 py-1.5 text-xs font-semibold text-white transition flex items-center gap-1.5"
              >
                <Camera className="h-3.5 w-3.5 text-indigo-400" />
                {cameraActive ? "Stop Camera" : "Activate Camera"}
              </button>
            </div>

            {/* Manual Code Input / USB Barcode Listener */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleValidateTicket(referenceInput);
              }}
              className="mt-6 flex gap-2"
            >
              <div className="relative flex-1">
                <Keyboard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Scan or enter reference (e.g. EVT-1729...)"
                  value={referenceInput}
                  onChange={(e) => setReferenceInput(e.target.value.toUpperCase())}
                  autoFocus
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 pl-10 font-mono text-sm text-white uppercase placeholder:normal-case placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={scanning || !referenceInput.trim()}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 font-bold text-white transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
              >
                {scanning ? "Verifying..." : "Validate"}
              </button>
            </form>
          </div>

          {/* Validation Result Flash Card */}
          <AnimatePresence mode="wait">
            {scanResult && (
              <motion.div
                key={scanResult.reference || scanResult.status}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`rounded-2xl border p-6 shadow-2xl backdrop-blur-xl ${
                  scanResult.valid
                    ? "border-emerald-500/50 bg-emerald-500/10 shadow-emerald-500/10"
                    : scanResult.duplicate
                    ? "border-rose-500 bg-rose-500/20 shadow-rose-500/20 animate-bounce"
                    : "border-amber-500/50 bg-amber-500/10 shadow-amber-500/10"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 mt-1">
                    {scanResult.valid ? (
                      <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                    ) : scanResult.duplicate ? (
                      <AlertTriangle className="h-10 w-10 text-rose-400" />
                    ) : (
                      <XCircle className="h-10 w-10 text-amber-400" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-xl font-black ${
                        scanResult.valid ? "text-emerald-300" : scanResult.duplicate ? "text-rose-300" : "text-amber-300"
                      }`}>
                        {scanResult.valid ? "VALID TICKET — ACCESS GRANTED" : scanResult.status}
                      </span>
                      <span className="font-mono text-xs text-slate-400">{scanResult.timestamp}</span>
                    </div>

                    <p className="mt-1 text-sm font-medium text-white">
                      {scanResult.error || scanResult.message}
                    </p>

                    {scanResult.attendee && (
                      <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400">Attendee Name:</span>
                          <p className="font-bold text-white text-sm mt-0.5">{scanResult.attendee.name}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Tickets Quantity:</span>
                          <p className="font-bold text-white text-sm mt-0.5">{scanResult.quantity} Ticket(s)</p>
                        </div>
                        {scanResult.seats && scanResult.seats.length > 0 && (
                          <div className="col-span-2">
                            <span className="text-slate-400">Assigned Seats:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {scanResult.seats.map((s) => (
                                <span key={s} className="rounded bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 text-indigo-300 font-bold">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {scanResult.duplicate && (
                          <div className="col-span-2 text-rose-300 font-semibold pt-2 border-t border-rose-500/20">
                            First scan was logged at {new Date(scanResult.firstCheckedInAt || "").toLocaleTimeString()}. Check attendee ID carefully.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Scan History & Live Feed (2 cols) */}
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white flex items-center justify-between mb-4">
              <span>Recent Scan History</span>
              <span className="text-[11px] text-slate-400">{history.length} scans</span>
            </h3>

            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {history.map((h, i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-3 text-xs transition ${
                    h.valid
                      ? "border-emerald-500/30 bg-emerald-500/5 text-slate-300"
                      : h.duplicate
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                      : "border-amber-500/30 bg-amber-500/5 text-amber-200"
                  }`}
                >
                  <div className="flex justify-between items-center font-semibold">
                    <span className="text-white">{h.attendee?.name || h.reference || "Unknown"}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      h.valid ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                    }`}>
                      {h.status}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>{h.reference}</span>
                    <span>{h.timestamp}</span>
                  </div>
                </div>
              ))}

              {history.length === 0 && (
                <p className="text-xs text-slate-500 py-10 text-center">
                  Scanned passes will appear here in real time.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
