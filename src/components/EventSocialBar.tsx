"use client";

import { useState, useEffect } from "react";
import { Heart, Share2, UserPlus, Check, Users } from "lucide-react";
import { SocialShareModal } from "./SocialShareModal";

export function EventSocialBar({
  eventId,
  eventTitle,
  organizerId,
  organizerName,
}: {
  eventId: number;
  eventTitle: string;
  organizerId?: number;
  organizerName?: string | null;
}) {
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Load initial likes & follows
  useEffect(() => {
    fetch(`/api/events/${eventId}/likes`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setLikesCount(data.likesCount || 0);
          setIsLiked(Boolean(data.isLiked));
        }
      })
      .catch(() => {});

    if (organizerId) {
      fetch(`/api/organizers/${organizerId}/follow`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setFollowerCount(data.followerCount || 0);
            setIsFollowing(Boolean(data.isFollowing));
          }
        })
        .catch(() => {});
    }
  }, [eventId, organizerId]);

  const handleToggleLike = async () => {
    if (likeBusy) return;
    setLikeBusy(true);

    // Optimistic update
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikesCount((c) => (nextLiked ? c + 1 : Math.max(0, c - 1)));

    try {
      const res = await fetch(`/api/events/${eventId}/likes`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setIsLiked(data.isLiked);
        setLikesCount(data.likesCount);
      }
    } catch {}
    setLikeBusy(false);
  };

  const handleToggleFollow = async () => {
    if (!organizerId || followBusy) return;
    setFollowBusy(true);

    const nextFollow = !isFollowing;
    setIsFollowing(nextFollow);
    setFollowerCount((c) => (nextFollow ? c + 1 : Math.max(0, c - 1)));

    try {
      const res = await fetch(`/api/organizers/${organizerId}/follow`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.isFollowing);
        setFollowerCount(data.followerCount);
      }
    } catch {}
    setFollowBusy(false);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {/* Like Button */}
        <button
          type="button"
          onClick={handleToggleLike}
          disabled={likeBusy}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition shadow-sm ${
            isLiked
              ? "border-rose-500/40 bg-rose-500/10 text-rose-400"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Heart className={`h-4 w-4 ${isLiked ? "fill-rose-500 text-rose-500" : "text-gray-400"}`} />
          <span>{likesCount} {likesCount === 1 ? "Like" : "Likes"}</span>
        </button>

        {/* Share Button */}
        <button
          type="button"
          onClick={() => setIsShareModalOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
        >
          <Share2 className="h-4 w-4 text-indigo-500" />
          <span>Share & Invite</span>
        </button>

        {/* Follow Organizer */}
        {organizerId && (
          <button
            type="button"
            onClick={handleToggleFollow}
            disabled={followBusy}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition shadow-sm ${
              isFollowing
                ? "border-indigo-500/40 bg-indigo-50 text-indigo-600"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {isFollowing ? (
              <Check className="h-4 w-4 text-indigo-600" />
            ) : (
              <UserPlus className="h-4 w-4 text-gray-400" />
            )}
            <span>
              {isFollowing ? "Following Host" : "Follow Host"} ({followerCount})
            </span>
          </button>
        )}
      </div>

      <SocialShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        eventId={eventId}
        eventTitle={eventTitle}
      />
    </>
  );
}
