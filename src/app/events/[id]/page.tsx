"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, MapPin, Users, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

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
  organizerName?: string | null;
};

function EventDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const cancelled = searchParams.get("cancelled");

  const id = params.id as string;

  useEffect(() => {
    fetch(`/api/events/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setEvent(data.event);
        setLoading(false);
      });
  }, [id]);

  const handleBook = async () => {
    if (!user) {
      router.push(`/login?redirect=/events/${id}`);
      return;
    }
    setBooking(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: Number(id) }),
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

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatPrice = (cents: number) => (cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`);

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

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
        >
          <div
            className="h-64 w-full bg-cover bg-center sm:h-96"
            style={{ backgroundImage: `url(${event.imageUrl ?? "/placeholder-event.jpg"})` }}
          />
          <div className="p-6 sm:p-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="rounded-full bg-[#F84464]/10 px-3 py-1 text-xs font-semibold text-[#F84464]">
                  {event.category}
                </span>
                <h1 className="mt-4 text-3xl font-bold sm:text-4xl text-gray-900">{event.title}</h1>
                <p className="mt-2 text-gray-500 font-medium">Hosted by {event.organizerName ?? "Evently"}</p>
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

            <div className="mt-10">
              <button
                onClick={handleBook}
                disabled={soldOut || booking}
                className={`w-full rounded-lg py-4 text-base font-semibold transition sm:w-auto sm:px-12 ${
                  soldOut
                    ? "cursor-not-allowed bg-gray-200 text-gray-500"
                    : "bg-[#F84464] text-white hover:bg-rose-600 shadow-md"
                }`}
              >
                {booking ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> Redirecting to checkout…
                  </span>
                ) : soldOut ? (
                  "Sold out"
                ) : (
                  `Book Ticket - ${formatPrice(event.ticketPriceCents)}`
                )}
              </button>
            </div>
          </div>
        </motion.div>
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
