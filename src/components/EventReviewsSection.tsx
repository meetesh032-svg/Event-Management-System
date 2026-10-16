"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  MessageSquare,
  Camera,
  CornerDownRight,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  User,
  PlusCircle,
  X,
} from "lucide-react";

interface ReviewItem {
  id: number;
  rating: number;
  title: string | null;
  comment: string;
  photoUrls: string[];
  organizerReply: string | null;
  organizerRepliedAt: string | null;
  createdAt: string;
  userId: number;
  userName: string;
  userAvatar: string | null;
}

export function EventReviewsSection({
  eventId,
  currentUserId,
  isEventOrganizer,
}: {
  eventId: number;
  currentUserId?: number;
  isEventOrganizer?: boolean;
}) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [distribution, setDistribution] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [loading, setLoading] = useState(true);

  // Review submission modal state
  const [showModal, setShowModal] = useState(false);
  const [formRating, setFormRating] = useState(5);
  const [formHoverRating, setFormHoverRating] = useState(0);
  const [formTitle, setFormTitle] = useState("");
  const [formComment, setFormComment] = useState("");
  const [formImageFiles, setFormImageFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Organizer reply state
  const [replyingReviewId, setReplyingReviewId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchReviews = () => {
    fetch(`/api/events/${eventId}/reviews`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setReviews(data.reviews || []);
          setAverageRating(data.averageRating || 0);
          setTotalReviews(data.totalReviews || 0);
          setDistribution(data.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReviews();
  }, [eventId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    try {
      const uploadedUrls: string[] = [];
      for (const file of formImageFiles) {
        const fd = new FormData();
        fd.append("file", file);
        const upRes = await fetch("/api/upload", { method: "POST", body: fd });
        if (upRes.ok) {
          const upData = await upRes.json();
          if (upData.url) uploadedUrls.push(upData.url);
        }
      }

      const res = await fetch(`/api/events/${eventId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: formRating,
          title: formTitle.trim() || undefined,
          comment: formComment.trim(),
          photoUrls: uploadedUrls,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit review");
      }

      setShowModal(false);
      setFormTitle("");
      setFormComment("");
      setFormImageFiles([]);
      fetchReviews();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error submitting review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOrganizerReply = async (reviewId: number) => {
    if (!replyText.trim() || submittingReply) return;
    setSubmittingReply(true);

    try {
      const res = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: replyText.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId
              ? { ...r, organizerReply: data.organizerReply, organizerRepliedAt: data.organizerRepliedAt }
              : r
          )
        );
        setReplyingReviewId(null);
        setReplyText("");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to submit reply");
      }
    } catch {
      alert("Error posting reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleReportReview = async (reviewId: number) => {
    const reason = prompt("Please tell us why you are reporting this review (e.g. spam, abusive language):");
    if (!reason || !reason.trim()) return;

    try {
      const res = await fetch(`/api/reviews/${reviewId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        alert("Thank you. The review has been flagged for administrator moderation.");
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      }
    } catch {
      alert("Error reporting review");
    }
  };

  return (
    <div className="space-y-8 pt-8 border-t border-white/10">
      {/* Header & Overall Rating Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-indigo-400" /> Ratings & Reviews
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Real feedback from verified attendees who experienced this event.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-bold text-white transition shadow-lg shadow-indigo-600/30"
        >
          <PlusCircle className="h-4 w-4" /> Write a Review
        </button>
      </div>

      {/* Ratings Distribution Summary Box */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl grid sm:grid-cols-3 gap-6 items-center">
        {/* Big score */}
        <div className="text-center sm:border-r border-white/10 sm:pr-6">
          <div className="text-5xl font-black text-white">{averageRating.toFixed(1)}</div>
          <div className="flex justify-center gap-1 my-2 text-amber-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${
                  star <= Math.round(averageRating) ? "fill-amber-400" : "text-slate-600"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-slate-400">Based on {totalReviews} review{totalReviews !== 1 ? "s" : ""}</p>
        </div>

        {/* Distribution Bars */}
        <div className="sm:col-span-2 space-y-1.5 text-xs">
          {[5, 4, 3, 2, 1].map((ratingVal) => {
            const count = distribution[ratingVal] || 0;
            const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
            return (
              <div key={ratingVal} className="flex items-center gap-3">
                <span className="w-6 text-slate-400 font-medium">{ratingVal} ★</span>
                <div className="flex-1 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 text-right text-slate-400 text-[11px] font-mono">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((rev) => (
          <div
            key={rev.id}
            className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 shadow-lg backdrop-blur-xl transition hover:border-white/20"
          >
            {/* Review Author & Rating */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {rev.userAvatar ? (
                  <img
                    src={rev.userAvatar}
                    alt={rev.userName}
                    className="h-10 w-10 rounded-full object-cover border border-white/10"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center font-bold text-white text-sm">
                    {rev.userName[0]?.toUpperCase() || "A"}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-white text-sm">{rev.userName}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-3 w-3 ${s <= rev.rating ? "fill-amber-400" : "text-slate-600"}`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Report Abuse Button */}
              <button
                type="button"
                onClick={() => handleReportReview(rev.id)}
                className="text-slate-500 hover:text-rose-400 transition text-[11px] flex items-center gap-1"
                title="Report inappropriate review"
              >
                <ShieldAlert className="h-3.5 w-3.5" /> Report
              </button>
            </div>

            {/* Title & Comment */}
            {rev.title && <h5 className="font-semibold text-white mt-3 text-sm">{rev.title}</h5>}
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">{rev.comment}</p>

            {/* Photos attached */}
            {rev.photoUrls && rev.photoUrls.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {rev.photoUrls.map((url, idx) => (
                  <a key={idx} href={url} target="_blank" rel="noreferrer">
                    <img
                      src={url}
                      alt={`Review photo ${idx + 1}`}
                      className="h-16 w-20 object-cover rounded-xl border border-white/10 hover:border-indigo-400 transition"
                    />
                  </a>
                ))}
              </div>
            )}

            {/* Organizer Reply */}
            {rev.organizerReply && (
              <div className="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 text-xs">
                <div className="flex items-center gap-2 text-indigo-300 font-bold mb-1">
                  <CornerDownRight className="h-3.5 w-3.5" /> Response from Host
                  {rev.organizerRepliedAt && (
                    <span className="text-[10px] text-slate-400 font-normal">
                      • {new Date(rev.organizerRepliedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-slate-200">{rev.organizerReply}</p>
              </div>
            )}

            {/* Organizer Reply Form (if organizer viewing and not yet replied) */}
            {isEventOrganizer && !rev.organizerReply && (
              <div className="mt-4 pt-3 border-t border-white/5">
                {replyingReviewId === rev.id ? (
                  <div className="space-y-2">
                    <textarea
                      rows={2}
                      placeholder="Write an official response to this attendee..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingReviewId(null);
                          setReplyText("");
                        }}
                        className="rounded-lg px-3 py-1 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={submittingReply || !replyText.trim()}
                        onClick={() => handleOrganizerReply(rev.id)}
                        className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1 text-xs font-bold text-white transition disabled:opacity-50"
                      >
                        {submittingReply ? "Posting..." : "Post Reply"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingReviewId(rev.id);
                      setReplyText("");
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:underline"
                  >
                    <CornerDownRight className="h-3 w-3" /> Reply as Organizer
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {reviews.length === 0 && !loading && (
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-slate-400">
            <MessageSquare className="h-10 w-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">No reviews yet</p>
            <p className="text-xs text-slate-500 mt-1">Be the first to share your experience!</p>
          </div>
        )}
      </div>

      {/* Review Submission Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl text-white relative"
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-lg font-bold">Write a Review</h3>
              <p className="text-xs text-slate-400 mt-0.5">Share your feedback and rating with other attendees.</p>

              {submitError && (
                <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
                  {submitError}
                </div>
              )}

              <form onSubmit={handleSubmitReview} className="mt-4 space-y-4">
                {/* Star Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Your Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = (formHoverRating || formRating) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setFormHoverRating(star)}
                          onMouseLeave={() => setFormHoverRating(0)}
                          onClick={() => setFormRating(star)}
                          className="p-1 text-amber-400 transition transform hover:scale-110"
                        >
                          <Star className={`h-6 w-6 ${isFilled ? "fill-amber-400" : "text-slate-600"}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Review Title (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Unforgettable experience!"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Your Comments</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Tell us what you loved, the atmosphere, venue, organization..."
                    value={formComment}
                    onChange={(e) => setFormComment(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Photo Upload */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Upload Photos</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        setFormImageFiles(Array.from(e.target.files).slice(0, 3));
                      }
                    }}
                    className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-white/20"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">Max 3 event photos</p>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !formComment.trim()}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-bold text-white transition disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Post Review"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
