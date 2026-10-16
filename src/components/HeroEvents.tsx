"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Sparkles } from "lucide-react";
import { EventCard, EventCardSkeleton } from "@/components/ui";

type EventItem = {
  id: number;
  title: string;
  category: string;
  location?: string | null;
  startsAt?: string | null;
  imageUrl?: string | null;
  ticketPriceCents?: number;
  ticketsRemaining?: number;
  capacity?: number;
};

export function HeroEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => setEvents(data.events?.slice(0, 5) ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-14">
      {/* Section Header */}
      <div className="mb-6 sm:mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF0F3] text-[#F84464]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Recommended Events
            </h2>
            <p className="text-xs text-gray-500 hidden sm:block">
              Top curated concerts, movies, sports and entertainment
            </p>
          </div>
        </div>

        <Link
          href="/events"
          className="group inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#F84464] hover:text-[#E03252] transition-colors"
        >
          <span>See All</span>
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Grid or Horizontal Scroller */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {[...Array(5)].map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-gray-600">No events currently scheduled.</p>
          <Link
            href="/dashboard/events/new"
            className="mt-3 inline-block rounded-xl bg-[#F84464] px-4 py-2 text-xs font-bold text-white hover:bg-[#E03252]"
          >
            Create First Show
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {events.map((event, idx) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
            >
              <EventCard
                id={event.id}
                title={event.title}
                category={event.category}
                location={event.location}
                startsAt={event.startsAt}
                imageUrl={event.imageUrl}
                ticketPriceCents={event.ticketPriceCents}
                ticketsRemaining={event.ticketsRemaining}
                capacity={event.capacity}
              />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
