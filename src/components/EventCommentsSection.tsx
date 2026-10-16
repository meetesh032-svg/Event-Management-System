"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Send, User, ThumbsUp, Sparkles, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

interface Comment {
  id: number;
  userId: number;
  userName: string | null;
  userAvatar?: string | null;
  comment: string;
  isPinned?: boolean;
  isOrganizer?: boolean;
  createdAt: string;
  likesCount?: number;
}

export function EventCommentsSection({
  eventId,
  organizerId,
}: {
  eventId: number;
  organizerId?: number;
}) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    if (!user) {
      alert("Please log in to leave a question or comment.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: newComment.trim() }),
      });
      if (res.ok) {
        setNewComment("");
        await fetchComments();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to post comment");
      }
    } catch {
      alert("Network error posting comment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Community Discussion & Q&A</h3>
            <p className="text-xs text-gray-500">Ask the host questions or connect with other attendees</p>
          </div>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
          {comments.length} {comments.length === 1 ? "Discussion" : "Discussions"}
        </span>
      </div>

      {/* Post comment input */}
      <form onSubmit={handleSubmit} className="mt-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 font-bold text-xs uppercase">
            {user?.name ? user.name[0] : <User className="h-4 w-4" />}
          </div>
          <div className="flex-1">
            <textarea
              rows={2}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={user ? "Ask a question about parking, dress code, schedule, etc..." : "Log in to join the conversation..."}
              disabled={!user || submitting}
              className="w-full rounded-xl border border-gray-200 p-3 text-xs sm:text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-gray-400">Be respectful and adhere to community guidelines.</span>
              <button
                type="submit"
                disabled={!user || !newComment.trim() || submitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{submitting ? "Posting..." : "Post Comment"}</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="mt-8 space-y-4">
        {loading ? (
          <div className="py-6 text-center text-xs text-gray-400">Loading discussions...</div>
        ) : comments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center">
            <p className="text-xs font-medium text-gray-500">No questions yet. Be the first to start the discussion!</p>
          </div>
        ) : (
          comments.map((comm) => {
            const isHost = comm.userId === organizerId;
            return (
              <div
                key={comm.id}
                className={`rounded-xl border p-4 transition ${
                  isHost ? "border-indigo-200 bg-indigo-50/40" : "border-gray-100 bg-gray-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-gray-700 font-bold text-xs">
                      {comm.userName ? comm.userName[0].toUpperCase() : "U"}
                    </div>
                    <span className="text-xs font-bold text-gray-900">{comm.userName || "Attendee"}</span>
                    {isHost && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                        <ShieldCheck className="h-3 w-3" /> Event Host
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-400">
                    {new Date(comm.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                  {comm.comment}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
