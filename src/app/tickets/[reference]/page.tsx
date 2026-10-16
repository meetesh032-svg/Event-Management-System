"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  MapPin,
  Download,
  Share2,
  Send,
  XCircle,
  Clock,
  ArrowLeft,
  Loader2,
  Check,
  AlertCircle,
  Copy,
  Ticket,
  ShieldCheck,
} from "lucide-react";
import { formatPrice } from "@/lib/format";

type TicketData = {
  id: number;
  reference: string;
  status: string;
  quantity: number;
  totalCents: number;
  seats: string[];
  refundStatus: string;
  cancelledAt: string | null;
  createdAt: string;
  qrDataUrl: string;
  barcodeDataUrl: string;
  attendee: {
    name: string;
    email: string;
  };
  event: {
    id: number;
    title: string;
    description: string;
    category: string;
    location: string;
    startsAt: string;
    endsAt: string;
    imageUrl?: string | null;
    venue?: {
      name: string;
      address: string;
      city: string;
    } | null;
  };
  isOwner: boolean;
  isOrganizer: boolean;
};

export default function MobileTicketPage() {
  const params = useParams();
  const router = useRouter();
  const reference = (params?.reference as string) || "";

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferEmail, setTransferEmail] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [transferMsg, setTransferMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!reference) return;

    fetch(`/api/tickets/${reference}`, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load ticket");
        setTicket(data.ticket);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [reference]);

  // Handle Web Share or Copy Link
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share && ticket) {
      try {
        await navigator.share({
          title: `Ticket for ${ticket.event.title}`,
          text: `Here is my Gatherly ticket for ${ticket.event.title}!`,
          url,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Handle Ticket Transfer
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    setTransferring(true);
    setTransferMsg(null);

    try {
      const res = await fetch(`/api/bookings/${ticket.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recipientEmail: transferEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Transfer failed");
      }

      setTransferMsg({ text: data.message, isError: false });
      setTimeout(() => {
        setShowTransferModal(false);
        router.push(`/tickets/${data.newReference}`);
      }, 2000);
    } catch (err) {
      setTransferMsg({
        text: err instanceof Error ? err.message : "Transfer failed",
        isError: true,
      });
    } finally {
      setTransferring(false);
    }
  };

  // Handle Ticket Cancellation & Refund
  const handleCancel = async () => {
    if (!ticket) return;
    setCancelling(true);

    try {
      const res = await fetch(`/api/bookings/${ticket.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: cancelReason, refundToWallet: true }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Cancellation failed");
      }

      alert(data.message);
      setShowCancelModal(false);
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 bg-slate-950 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-[#F84464]" />
        <p className="text-sm">Retrieving digital mobile pass…</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 bg-slate-950 text-white text-center">
        <div className="rounded-full bg-rose-500/20 p-4 text-rose-400 mb-4">
          <AlertCircle className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold">Ticket Not Found</h2>
        <p className="mt-2 text-sm text-slate-400 max-w-sm">
          {error || "We could not find a verified ticket associated with this reference."}
        </p>
        <Link
          href="/events"
          className="mt-6 rounded-xl bg-[#F84464] px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 transition"
        >
          Explore Events
        </Link>
      </div>
    );
  }

  const isCancelled = ticket.status === "cancelled";
  const startDate = new Date(ticket.event.startsAt);
  const formattedDate = startDate.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = startDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 sm:px-6 flex flex-col items-center justify-center">
      {/* Back button */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <Link
          href="/bookings"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to My Tickets
        </Link>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
          <ShieldCheck className="h-3.5 w-3.5" /> Verified Pass
        </span>
      </div>

      {/* Mobile Ticket Stub */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md overflow-hidden rounded-3xl bg-slate-900 border border-white/10 shadow-2xl relative text-white"
      >
        {/* Event Poster Header */}
        <div className="relative h-44 w-full bg-slate-800">
          <img
            src={ticket.event.imageUrl || "/placeholder-event.jpg"}
            alt={ticket.event.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

          {/* Status badge */}
          <div className="absolute top-4 right-4">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                isCancelled
                  ? "bg-rose-500/90 text-white"
                  : "bg-emerald-500/90 text-white shadow-lg shadow-emerald-500/30"
              }`}
            >
              {ticket.status}
            </span>
          </div>

          <div className="absolute bottom-3 left-5 right-5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#F84464]">
              {ticket.event.category}
            </span>
            <h1 className="text-xl font-bold leading-tight line-clamp-1">
              {ticket.event.title}
            </h1>
          </div>
        </div>

        {/* Ticket Details Body */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-white/5 border border-white/5 p-3">
              <span className="text-slate-400 block mb-0.5">Date & Time</span>
              <strong className="text-white text-sm block">{formattedDate}</strong>
              <span className="text-slate-300">{formattedTime}</span>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/5 p-3">
              <span className="text-slate-400 block mb-0.5">Location</span>
              <strong className="text-white text-sm block line-clamp-1">
                {ticket.event.venue?.name || ticket.event.location}
              </strong>
              <span className="text-slate-300 text-[11px] line-clamp-1">
                {ticket.event.venue?.city || "Venue Entrance"}
              </span>
            </div>
          </div>

          {/* Attendee & Seats Info */}
          <div className="rounded-xl bg-white/5 border border-white/5 p-3.5 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Attendee</span>
              <strong className="text-white text-sm font-semibold">{ticket.attendee.name}</strong>
              <span className="text-slate-400 text-[11px] block">{ticket.quantity} Ticket(s)</span>
            </div>
            {ticket.seats && ticket.seats.length > 0 && (
              <div className="text-right">
                <span className="text-slate-400 block mb-1">Seats</span>
                <div className="flex flex-wrap justify-end gap-1">
                  {ticket.seats.map((seat) => (
                    <span
                      key={seat}
                      className="rounded bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 font-mono font-bold text-indigo-300 text-xs"
                    >
                      {seat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Perforated Tear Line with Notches */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute -left-9 h-7 w-7 rounded-full bg-slate-950 border-r border-white/10" />
            <div className="w-full border-t border-dashed border-white/20" />
            <div className="absolute -right-9 h-7 w-7 rounded-full bg-slate-950 border-l border-white/10" />
          </div>

          {/* Scannable QR Code */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="p-3 rounded-2xl bg-white shadow-xl">
              <img
                src={ticket.qrDataUrl}
                alt={`QR code for ${ticket.reference}`}
                className="h-44 w-44 object-contain"
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-400 font-medium">
              Present this QR code at venue entrance for instant check-in
            </p>
          </div>

          {/* High-Contrast Linear Barcode */}
          <div className="flex flex-col items-center justify-center py-1 bg-white/5 rounded-xl p-3 border border-white/5">
            <img
              src={ticket.barcodeDataUrl}
              alt={`Barcode for ${ticket.reference}`}
              className="max-w-full h-12 object-contain"
            />
            <p className="mt-1 font-mono text-xs font-semibold text-slate-300 tracking-wider">
              {ticket.reference}
            </p>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="border-t border-white/10 bg-slate-900/80 p-4 grid grid-cols-2 gap-2">
          <a
            href={`/api/bookings/${ticket.id}/ticket`}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 px-3 py-2.5 text-xs font-semibold transition"
          >
            <Download className="h-3.5 w-3.5" /> PDF Ticket
          </a>

          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 px-3 py-2.5 text-xs font-semibold transition"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied Link!
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5" /> Share Ticket
              </>
            )}
          </button>

          {ticket.isOwner && !isCancelled && (
            <>
              <button
                onClick={() => setShowTransferModal(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 px-3 py-2 text-xs font-semibold text-indigo-300 transition"
              >
                <Send className="h-3.5 w-3.5" /> Transfer Pass
              </button>

              <button
                onClick={() => setShowCancelModal(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-300 transition"
              >
                <XCircle className="h-3.5 w-3.5" /> Cancel / Refund
              </button>
            </>
          )}
        </div>
      </motion.div>

      {/* Transfer Ticket Modal */}
      <AnimatePresence>
        {showTransferModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl text-white"
            >
              <h3 className="text-base font-bold flex items-center gap-2">
                <Send className="h-4 w-4 text-indigo-400" /> Transfer Ticket
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Transfer ownership of this ticket. A new secure ticket barcode will be generated and issued to the recipient.
              </p>

              {transferMsg && (
                <div
                  className={`mt-3 p-3 rounded-xl text-xs font-medium ${
                    transferMsg.isError
                      ? "bg-rose-500/15 border border-rose-500/30 text-rose-300"
                      : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                  }`}
                >
                  {transferMsg.text}
                </div>
              )}

              <form onSubmit={handleTransfer} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Recipient Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="friend@example.com"
                    value={transferEmail}
                    onChange={(e) => setTransferEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(false)}
                    className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={transferring}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50"
                  >
                    {transferring ? "Transferring..." : "Confirm Transfer"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancel & Refund Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl text-white"
            >
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <XCircle className="h-4 w-4" /> Cancel Booking & Refund
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Are you sure you want to cancel this ticket? Any held seats will be released back to the event.
              </p>

              <div className="my-3 rounded-xl bg-white/5 p-3 text-xs text-slate-300">
                Refund Amount: <strong>{formatPrice(ticket.totalCents)}</strong> (will be credited directly to your Gatherly Wallet)
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Reason for cancellation (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Schedule change, emergency"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(false)}
                    className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Keep Ticket
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50"
                  >
                    {cancelling ? "Cancelling..." : "Confirm Cancellation"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
