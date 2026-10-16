"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2,
  Copy,
  Check,
  X,
  Mail,
  Send,
  Loader2,
} from "lucide-react";

export function SocialShareModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
}: {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  eventTitle: string;
}) {
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const eventUrl = typeof window !== "undefined" ? `${window.location.origin}/events/${eventId}` : "";
  const shareText = `Check out "${eventTitle}" on Gatherly! Book tickets here:`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventTitle,
          text: shareText,
          url: eventUrl,
        });
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || sendingInvite) return;
    setSendingInvite(true);
    setInviteSuccess(false);

    try {
      const res = await fetch(`/api/events/${eventId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: [inviteEmail.trim()],
          message: inviteMessage.trim() || undefined,
        }),
      });

      if (res.ok) {
        setInviteSuccess(true);
        setInviteEmail("");
        setInviteMessage("");
        setTimeout(() => setInviteSuccess(false), 3000);
      }
    } catch {}
    setSendingInvite(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl text-white relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-lg font-bold flex items-center gap-2">
          <Share2 className="h-5 w-5 text-indigo-400" /> Share Event
        </h3>
        <p className="text-xs text-slate-400 mt-1 line-clamp-1">{eventTitle}</p>

        {/* 1-Click Social Channels */}
        <div className="mt-5 grid grid-cols-4 gap-2">
          {/* WhatsApp */}
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${eventUrl}`)}`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300 hover:bg-emerald-500/20 transition"
          >
            <span className="text-lg font-bold">WA</span>
            <span className="text-[10px] font-semibold">WhatsApp</span>
          </a>

          {/* X / Twitter */}
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(eventUrl)}`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sky-300 hover:bg-sky-500/20 transition"
          >
            <span className="text-lg font-bold">𝕏</span>
            <span className="text-[10px] font-semibold">Twitter</span>
          </a>

          {/* LinkedIn */}
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(eventUrl)}`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-blue-300 hover:bg-blue-500/20 transition"
          >
            <span className="text-lg font-bold">in</span>
            <span className="text-[10px] font-semibold">LinkedIn</span>
          </a>

          {/* Facebook */}
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-indigo-300 hover:bg-indigo-500/20 transition"
          >
            <span className="text-lg font-bold">fb</span>
            <span className="text-[10px] font-semibold">Facebook</span>
          </a>
        </div>

        {/* Copy Link Input */}
        <div className="mt-5">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Direct Event Link</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={eventUrl}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-300 select-all outline-none"
            />
            <button
              onClick={handleCopyLink}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                copied ? "bg-emerald-600 text-white" : "bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Invite Friends via Email */}
        <div className="mt-6 pt-5 border-t border-white/10">
          <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-indigo-400" /> Send Personal Email Invite
          </label>

          {inviteSuccess && (
            <div className="mb-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2 text-xs text-emerald-300">
              ✓ Invitation sent successfully!
            </div>
          )}

          <form onSubmit={handleSendInvite} className="space-y-2">
            <input
              type="email"
              required
              placeholder="Friend's email (e.g. friend@example.com)"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              placeholder="Personal message (e.g. Hey, let's go together!)"
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={sendingInvite || !inviteEmail.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs font-bold text-white transition disabled:opacity-50"
              >
                {sendingInvite ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                Send Invitation
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
