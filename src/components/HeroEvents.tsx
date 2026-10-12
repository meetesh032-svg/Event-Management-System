"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

type EventItem = {
  id: number;
  title: string;
  category: string;
  imageUrl?: string | null;
};

export function HeroEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/events?limit=6")
      .then((r) => r.json())
      .then((data) => setEvents(data.events?.slice(0, 5) ?? [])) // Usually BMS shows 5 per row
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Recommended Events</h2>
        <Link href="/events" className="text-sm font-semibold text-[#F84464] hover:underline">
          See All ›
        </Link>
      </div>

      {loading ? (
        <div className="flex overflow-x-auto gap-6 pb-4 hidden-scrollbar">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="min-w-[220px] max-w-[220px] h-[350px] bg-gray-200 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="flex overflow-x-auto gap-6 pb-4 hidden-scrollbar">
          {events.map((event, idx) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="min-w-[220px] max-w-[220px] flex-shrink-0"
            >
              <Link href={`/events/${event.id}`} className="group block">
                <div
                  className="h-[320px] w-full rounded-lg bg-gray-200 bg-cover bg-center transition-transform duration-300 group-hover:shadow-lg"
                  style={{ backgroundImage: `url(${event.imageUrl ?? "/placeholder-event.jpg"})` }}
                />
                <div className="mt-3">
                  <h3 className="text-[17px] font-bold text-gray-900 truncate leading-tight">{event.title}</h3>
                  <p className="mt-1 text-[13px] text-gray-500">{event.category}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
