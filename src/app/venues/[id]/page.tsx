"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  MapPin,
  Users,
  Calendar,
  Accessibility,
  ArrowLeft,
  Loader2,
  Check,
  Tag,
} from "lucide-react";
import { formatRupees } from "@/lib/format";

type VenueDetailData = {
  venue: {
    id: number;
    name: string;
    description: string | null;
    address: string;
    city: string;
    state: string | null;
    capacity: number;
    imageUrl: string | null;
    mapCoordinates: string | null;
    amenities: string[];
  };
  layouts: Array<{
    id: number;
    name: string;
    rows: number;
    cols: number;
    vipRows: string[];
    accessibleSeats: string[];
    categories: Array<{ name: string; multiplier: number; color: string }>;
  }>;
  events: Array<{
    id: number;
    title: string;
    category: string;
    startsAt: string;
    ticketPriceCents: number;
    imageUrl: string | null;
  }>;
};

export default function VenueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [data, setData] = useState<VenueDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/venues/${resolvedParams.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Venue not found");
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#F84464]" />
      </div>
    );
  }

  if (!data || !data.venue) {
    return (
      <div className="mx-auto max-w-xl py-24 text-center px-6">
        <h2 className="text-xl font-bold text-gray-900">Venue Not Found</h2>
        <Link
          href="/venues"
          className="mt-6 inline-block rounded-xl bg-[#F84464] px-5 py-2 text-xs font-semibold text-white hover:bg-rose-600 transition"
        >
          Back to Venues
        </Link>
      </div>
    );
  }

  const { venue, layouts, events: venueEvents } = data;
  const activeLayout = layouts[0] || {
    rows: 10,
    cols: 12,
    vipRows: ["A", "B"],
    accessibleSeats: ["J-1", "J-2", "J-11", "J-12"],
  };

  const rowLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").slice(0, activeLayout.rows);

  const getSeatCategory = (row: string, col: number) => {
    const seatId = `${row}-${col}`;
    if (activeLayout.accessibleSeats?.includes(seatId)) {
      return { type: "accessible", name: "Wheelchair Accessible", color: "#10B981" };
    }
    if (activeLayout.vipRows?.includes(row)) {
      return { type: "vip", name: "VIP Experience", color: "#F59E0B" };
    }
    if (["C", "D", "E"].includes(row)) {
      return { type: "premium", name: "Premium Reserved", color: "#8B5CF6" };
    }
    return { type: "standard", name: "Standard Admission", color: "#3B82F6" };
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Link
        href="/venues"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-6 transition"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Venues
      </Link>

      {/* Venue Header */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm mb-10 flex flex-col md:flex-row gap-6">
        <div className="relative h-48 md:h-auto md:w-80 rounded-2xl overflow-hidden bg-gray-100 shrink-0">
          <Image
            src={venue.imageUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80"}
            alt={venue.name}
            fill
            className="object-cover"
            unoptimized
          />
        </div>

        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-[#F84464] uppercase">
                Official Venue
              </span>
              <span className="text-xs text-gray-400 font-medium">{venue.city}, India</span>
            </div>

            <h1 className="text-2xl font-black text-gray-900 mt-2">{venue.name}</h1>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-gray-400" /> {venue.address}
            </p>

            <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-gray-700">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-gray-400" /> Capacity: {venue.capacity.toLocaleString()} guests
              </span>
            </div>

            {venue.description && (
              <p className="mt-3 text-xs text-gray-600 leading-relaxed">{venue.description}</p>
            )}
          </div>

          {venue.amenities && venue.amenities.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
              {venue.amenities.map((a) => (
                <span
                  key={a}
                  className="rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-700 capitalize"
                >
                  ✓ {a}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Seat Layout Visualizer */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm mb-10">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-gray-900">Interactive Seat Layout Map</h2>
            <p className="text-xs text-gray-500">
              Visual seat category builder & accessibility layout for this venue.
            </p>
          </div>

          {/* Seat Categories Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#F59E0B]" /> VIP Area
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#8B5CF6]" /> Premium
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#3B82F6]" /> Standard
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#10B981]" /> Wheelchair Accessible
            </span>
          </div>
        </div>

        {/* Stage Screen Indicator */}
        <div className="mx-auto max-w-xl mb-8">
          <div className="rounded-xl bg-slate-900 text-white py-2 text-center text-xs font-bold tracking-widest uppercase shadow-sm">
            STAGE / SCREEN THIS WAY
          </div>
          <div className="h-1 bg-gradient-to-r from-transparent via-[#F84464] to-transparent mx-auto mt-1" />
        </div>

        {/* Seat Grid */}
        <div className="overflow-x-auto pb-4">
          <div className="mx-auto flex flex-col items-center gap-2 min-w-[500px]">
            {rowLetters.map((row) => (
              <div key={row} className="flex items-center gap-2">
                <span className="w-6 text-center font-mono text-xs font-bold text-gray-400">
                  {row}
                </span>

                <div className="flex items-center gap-2">
                  {Array.from({ length: activeLayout.cols }, (_, i) => i + 1).map((col) => {
                    const seatId = `${row}-${col}`;
                    const cat = getSeatCategory(row, col);
                    const isSelected = selectedSeat === seatId;

                    return (
                      <button
                        key={seatId}
                        onClick={() => setSelectedSeat(isSelected ? null : seatId)}
                        title={`${seatId} - ${cat.name}`}
                        style={{
                          backgroundColor: isSelected ? "#F84464" : cat.color,
                        }}
                        className={`h-7 w-7 rounded-lg text-[10px] font-bold text-white transition-all transform hover:scale-110 flex items-center justify-center shadow-xs ${
                          isSelected ? "ring-2 ring-rose-500 ring-offset-2 scale-110" : ""
                        }`}
                      >
                        {cat.type === "accessible" ? (
                          <Accessibility className="h-3.5 w-3.5" />
                        ) : (
                          col
                        )}
                      </button>
                    );
                  })}
                </div>

                <span className="w-6 text-center font-mono text-xs font-bold text-gray-400">
                  {row}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Seat Feedback Card */}
        {selectedSeat && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-between"
          >
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Selected Test Seat</span>
              <p className="text-sm font-black text-gray-900">
                Seat {selectedSeat} • {getSeatCategory(selectedSeat.split("-")[0], parseInt(selectedSeat.split("-")[1], 10)).name}
              </p>
            </div>
            <button
              onClick={() => setSelectedSeat(null)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
            >
              Clear Selection
            </button>
          </motion.div>
        )}
      </div>

      {/* Scheduled Shows at this Venue */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Upcoming Events at {venue.name}</h2>

        {venueEvents.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-xs text-gray-400">
            No upcoming events currently scheduled at this venue.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {venueEvents.map((evt) => (
              <Link
                key={evt.id}
                href={`/events/${evt.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100">
                  <Image
                    src={evt.imageUrl || "/placeholder-event.jpg"}
                    alt={evt.title}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-105"
                    unoptimized
                  />
                  <div className="absolute top-2.5 right-2.5 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                    {evt.category}
                  </div>
                </div>

                <div className="p-4 flex flex-1 flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm line-clamp-1 group-hover:text-[#F84464] transition">
                      {evt.title}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3 shrink-0 text-gray-400" />{" "}
                      {new Date(evt.startsAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-black">
                    <span>{formatRupees(evt.ticketPriceCents)}</span>
                    <span className="text-[#F84464] text-xs font-semibold">Book Ticket →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
