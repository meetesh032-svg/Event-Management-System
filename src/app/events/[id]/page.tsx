"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, MapPin, Users, ArrowLeft, Loader2, Heart, CheckCircle, Armchair, Clock, Sparkles, User, Mail, X } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { formatPrice } from "@/lib/format";
import SeatPickerModal from "@/components/SeatPickerModal";
import { EventReviewsSection } from "@/components/EventReviewsSection";
import { EventSocialBar } from "@/components/EventSocialBar";
import { EventCommentsSection } from "@/components/EventCommentsSection";
import { LiveEventPulse } from "@/components/LiveEventPulse";

type EventDetail = {
  id: number;
  title: string;
  description: string;
  category: string;
  location: string;
  startsAt: string;
  endsAt: string;
  ticketPriceCents: number;
  capacity: number;
  ticketsRemaining: number;
  imageUrl?: string | null;
  organizerId?: number;
  organizerName?: string | null;
  isVerifiedOrganizer?: boolean;
};

function EventDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [similarEvents, setSimilarEvents] = useState<EventDetail[]>([]);
  const [isSeatPickerOpen, setIsSeatPickerOpen] = useState(false);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const [waitlistMsg, setWaitlistMsg] = useState<string | null>(null);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [pendingSeatNumbers, setPendingSeatNumbers] = useState<string[] | undefined>();
  const cancelled = searchParams.get("cancelled");

  const id = params.id as string;

  useEffect(() => {
    fetch(`/api/events/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setEvent(data.event);
        setLoading(false);

        // Fetch similar events in this category
        if (data.event?.category) {
          fetch(
            `/api/events/discovery?similarTo=${id}&category=${encodeURIComponent(
              data.event.category
            )}`
          )
            .then((res) => (res.ok ? res.json() : null))
            .then((disc) => {
              if (disc?.similar) setSimilarEvents(disc.similar);
            })
            .catch(() => {});
        }
      });

    // Check wishlist state
    fetch(`/api/favorites/check?eventId=${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setIsFavorite(!!d.isFavorite);
      })
      .catch(() => {});
  }, [id]);

  const handleToggleFavorite = async () => {
    if (!user) {
      router.push(`/login?redirect=/events/${id}`);
      return;
    }
    setFavoriteLoading(true);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: Number(id) }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsFavorite(data.isFavorite);
      }
    } catch {
      // ignore
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleBook = async (seatNumbers?: string[], guestData?: { email: string; name: string }) => {
    if (!user && !guestData) {
      setPendingSeatNumbers(seatNumbers);
      setShowGuestModal(true);
      return;
    }

    setBooking(true);
    try {
      const payload: any = {
        eventId: Number(id),
        quantity: seatNumbers?.length || ticketQuantity,
      };

      if (seatNumbers && seatNumbers.length > 0) {
        payload.seatNumbers = seatNumbers;
      }

      if (payload.quantity >= 4) {
        payload.couponCode = "GROUP10";
      }

      if (guestData) {
        payload.isGuest = true;
        payload.guestEmail = guestData.email;
        payload.guestName = guestData.name;
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Could not start checkout");
        setBooking(false);
      }
    } catch {
      alert("Checkout failed");
      setBooking(false);
    }
  };

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoiningWaitlist(true);
    setWaitlistMsg(null);
    try {
      const res = await fetch(`/api/events/${id}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          guestEmail: waitlistEmail,
          quantity: ticketQuantity,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join waitlist");
      setWaitlistMsg(data.message);
      setTimeout(() => {
        setShowWaitlistModal(false);
      }, 3500);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error joining waitlist");
    } finally {
      setJoiningWaitlist(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading || !event) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#F84464]" />
      </div>
    );
  }

  const soldOut = event.ticketsRemaining <= 0;

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link href="/events" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition">
          <ArrowLeft className="h-4 w-4" /> Back to events
        </Link>

        {cancelled && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Your payment was cancelled. You can try again below.
          </div>
        )}

        {/* Real-time Live Features: Countdown, Ticket Scarcity & Viewers */}
        <div className="mb-6">
          <LiveEventPulse
            eventId={Number(id)}
            startsAt={event.startsAt}
            initialTicketsRemaining={event.ticketsRemaining}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          <div
            className="relative h-64 w-full bg-cover bg-center sm:h-96"
            style={{ backgroundImage: `url(${event.imageUrl ?? "/placeholder-event.jpg"})` }}
          >
            {/* Wishlist Heart Button on Poster */}
            <button
              onClick={handleToggleFavorite}
              disabled={favoriteLoading}
              title={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
              className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#F84464] shadow-md hover:bg-white hover:scale-110 transition"
            >
              <Heart
                className={`h-5 w-5 ${
                  isFavorite ? "fill-[#F84464] text-[#F84464]" : "text-gray-600"
                }`}
              />
            </button>
          </div>

          <div className="p-6 sm:p-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="rounded-full bg-[#F84464]/10 px-3 py-1 text-xs font-semibold text-[#F84464]">
                  {event.category}
                </span>
                <h1 className="mt-4 text-3xl font-bold sm:text-4xl text-gray-900">{event.title}</h1>

                {/* Organizer Link with Verified Badge */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-gray-500 text-sm font-medium">Hosted by</span>
                  {event.organizerId ? (
                    <Link
                      href={`/profile/${event.organizerId}`}
                      className="inline-flex items-center gap-1 text-sm font-bold text-gray-800 hover:text-[#F84464] hover:underline transition"
                    >
                      {event.organizerName ?? "Gatherly Host"}
                      {event.isVerifiedOrganizer && (
                        <CheckCircle className="h-4 w-4 fill-blue-600 text-white" />
                      )}
                    </Link>
                  ) : (
                    <span className="text-sm font-bold text-gray-800">
                      {event.organizerName ?? "Gatherly Host"}
                    </span>
                  )}
                </div>

                {/* Social Bar: Likes, Follow Host, Social Share & Invite */}
                <div className="mt-4">
                  <EventSocialBar
                    eventId={Number(id)}
                    eventTitle={event.title}
                    organizerId={event.organizerId}
                    organizerName={event.organizerName}
                  />
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{formatPrice(event.ticketPriceCents)}</div>
                <div className={`text-sm font-medium mt-1 ${soldOut ? "text-rose-500" : "text-emerald-600"}`}>
                  {soldOut ? "Sold out" : `${event.ticketsRemaining} tickets left`}
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Starts</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(event.startsAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Location</p>
                  <p className="text-sm font-semibold text-gray-900">{event.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <Users className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Capacity</p>
                  <p className="text-sm font-semibold text-gray-900">{event.capacity}</p>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <h3 className="text-xl font-bold text-gray-900">About this event</h3>
              <p className="mt-4 whitespace-pre-line leading-relaxed text-gray-600">{event.description}</p>
            </div>

            {/* Ticket Quantity Selector & Group Discount Indicator */}
            {!soldOut && (
              <div className="mt-8 rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                      Select Tickets
                    </label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {ticketQuantity >= 4 ? (
                        <span className="font-bold text-emerald-600 flex items-center gap-1">
                          <Sparkles className="h-3.5 w-3.5" /> Group Booking: 10% OFF applied with code GROUP10!
                        </span>
                      ) : (
                        <span>Book 4 or more tickets to get 10% group discount!</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5, 8, 10].map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => setTicketQuantity(qty)}
                        className={`h-8 w-8 sm:h-9 sm:w-9 rounded-xl text-xs font-bold transition ${
                          ticketQuantity === qty
                            ? "bg-[#F84464] text-white shadow-md shadow-[#F84464]/30"
                            : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {qty}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-4">
              {soldOut ? (
                <button
                  onClick={() => setShowWaitlistModal(true)}
                  className="w-full rounded-xl py-3.5 px-8 text-base font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md sm:w-auto flex items-center justify-center gap-2 transition"
                >
                  <Clock className="h-5 w-5" />
                  <span>Join Waiting List</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setIsSeatPickerOpen(true)}
                    disabled={booking}
                    className="w-full rounded-xl py-3.5 text-base font-bold transition sm:w-auto sm:px-8 flex items-center justify-center gap-2 bg-[#F84464] text-white hover:bg-rose-600 shadow-lg shadow-[#F84464]/20"
                  >
                    <Armchair className="h-5 w-5" />
                    <span>Select Seats & Book</span>
                  </button>

                  <button
                    onClick={() => handleBook()}
                    disabled={booking}
                    className="w-full rounded-xl py-3.5 px-6 text-sm font-semibold transition sm:w-auto border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
                  >
                    {booking ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Redirecting…
                      </span>
                    ) : (
                      `Quick Book (${formatPrice(event.ticketPriceCents * ticketQuantity)})`
                    )}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleToggleFavorite}
                disabled={favoriteLoading}
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white py-3.5 px-6 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition shadow-sm"
              >
                <Heart
                  className={`h-4 w-4 ${
                    isFavorite ? "fill-[#F84464] text-[#F84464]" : "text-gray-500"
                  }`}
                />
                {isFavorite ? "Saved to Wishlist" : "Save to Wishlist"}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Ratings & Reviews Section */}
        {event && (
          <div className="mt-14">
            <EventReviewsSection
              eventId={Number(id)}
              currentUserId={user?.id}
              isEventOrganizer={user?.id === event.organizerId || user?.role === "admin"}
            />
          </div>
        )}

        {/* Community Discussion & Host Q&A */}
        {event && (
          <div className="mt-10">
            <EventCommentsSection
              eventId={Number(id)}
              organizerId={event.organizerId}
            />
          </div>
        )}

        {/* Similar Events You May Like */}
        {similarEvents.length > 0 && (
          <div className="mt-14">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              More {event.category} Shows You May Like
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {similarEvents.map((sim) => (
                <Link
                  key={sim.id}
                  href={`/events/${sim.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition"
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100">
                    <img
                      src={sim.imageUrl || "/placeholder-event.jpg"}
                      alt={sim.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute top-2.5 right-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                      {sim.category}
                    </div>
                  </div>

                  <div className="p-3.5 flex flex-1 flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900 text-xs line-clamp-1 group-hover:text-[#F84464] transition">
                        {sim.title}
                      </h4>
                      <p className="mt-1 text-[11px] text-gray-500 line-clamp-1">{sim.location}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs font-bold">
                      <span className="text-gray-900">{formatPrice(sim.ticketPriceCents)}</span>
                      <span className="text-[#F84464] text-[11px]">View Show →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Seat Picker Modal */}
        {event && (
          <SeatPickerModal
            eventId={Number(id)}
            eventTitle={event.title}
            isOpen={isSeatPickerOpen}
            onClose={() => setIsSeatPickerOpen(false)}
            onCheckout={(seats) => {
              setIsSeatPickerOpen(false);
              handleBook(seats);
            }}
          />
        )}

        {/* Waiting List Modal */}
        {showWaitlistModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" /> Join Event Waiting List
                </h3>
                <button
                  onClick={() => setShowWaitlistModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="mt-3 text-xs text-gray-600 leading-relaxed">
                Tickets for <strong>{event?.title}</strong> are currently sold out. Join the waitlist to receive instant notifications when cancelled seats or additional tickets are released.
              </p>

              {waitlistMsg && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                  {waitlistMsg}
                </div>
              )}

              <form onSubmit={handleJoinWaitlist} className="mt-4 space-y-4">
                {!user && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Your Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs outline-none focus:border-[#F84464]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Number of Tickets Desired: <strong>{ticketQuantity}</strong>
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    {[1, 2, 3, 4, 5].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setTicketQuantity(q)}
                        className={`h-8 w-8 rounded-lg text-xs font-bold ${
                          ticketQuantity === q ? "bg-amber-500 text-white" : "border border-gray-200 text-gray-700"
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWaitlistModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={joiningWaitlist}
                    className="rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2 text-xs font-bold text-white transition shadow-sm disabled:opacity-50"
                  >
                    {joiningWaitlist ? "Joining..." : "Join Waiting List"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Guest Checkout Modal */}
        {showGuestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900">Checkout Options</h3>
                <button
                  onClick={() => setShowGuestModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                  <h4 className="text-sm font-bold text-gray-900">Option 1: Quick Guest Checkout</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    No password needed. We will email your e-ticket and invoice directly.
                  </p>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setShowGuestModal(false);
                      handleBook(pendingSeatNumbers, { email: guestEmail, name: guestName });
                    }}
                    className="mt-3 space-y-3"
                  >
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-[#F84464]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-[#F84464]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-xl bg-[#F84464] hover:bg-rose-600 py-2.5 text-xs font-bold text-white shadow-sm transition"
                    >
                      Continue to Payment ({formatPrice(event.ticketPriceCents * (pendingSeatNumbers?.length || ticketQuantity))})
                    </button>
                  </form>
                </div>

                <div className="text-center">
                  <span className="text-xs text-gray-400">or</span>
                </div>

                <button
                  type="button"
                  onClick={() => router.push(`/login?redirect=/events/${id}`)}
                  className="w-full rounded-xl border border-gray-300 py-2.5 text-xs font-bold text-gray-800 hover:bg-gray-50 transition"
                >
                  Log In to Existing Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EventDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-[#F84464]" />
        </div>
      }
    >
      <EventDetailContent />
    </Suspense>
  );
}
