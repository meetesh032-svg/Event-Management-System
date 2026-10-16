"use client";

import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  MapPin,
  Users,
  Search,
  Wifi,
  Car,
  Accessibility,
  Coffee,
  Wind,
  Plus,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";

type VenueItem = {
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

const amenityIcons: Record<string, React.ReactNode> = {
  parking: <Car className="h-3.5 w-3.5" />,
  wifi: <Wifi className="h-3.5 w-3.5" />,
  wheelchair: <Accessibility className="h-3.5 w-3.5 text-emerald-600" />,
  food: <Coffee className="h-3.5 w-3.5" />,
  ac: <Wind className="h-3.5 w-3.5" />,
};

function VenuesContent() {
  const { user } = useAuthStore();
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("All");

  const loadVenues = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (selectedCity !== "All") params.set("city", selectedCity);

    fetch(`/api/venues?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setVenues(data.venues || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadVenues();
  }, [selectedCity]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadVenues();
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Venue Explorer & Maps</h1>
          <p className="mt-1 text-xs text-gray-500">
            Discover premier concert halls, stadiums, multiplexes, and auditoriums with interactive seat layouts.
          </p>
        </div>

        {user?.role === "organizer" && (
          <Link
            href="/dashboard/venues/new"
            className="flex items-center gap-1.5 rounded-xl bg-[#F84464] px-4 py-2 text-xs font-semibold text-white hover:bg-rose-600 shadow-sm transition"
          >
            <Plus className="h-4 w-4" /> Add New Venue
          </Link>
        )}
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search venue by name..."
            className="w-full rounded-xl border border-gray-300 py-2 pl-10 pr-4 text-xs outline-none focus:border-[#F84464]"
          />
        </form>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {["All", "Mumbai", "Delhi", "Bengaluru", "Pune", "Hyderabad"].map((city) => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                selectedCity === city
                  ? "bg-[#F84464] text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* Venues Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#F84464]" />
        </div>
      ) : venues.length === 0 ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <h3 className="text-base font-bold text-gray-900">No venues found</h3>
          <p className="mt-1 text-xs text-gray-500">
            {user?.role === "organizer"
              ? "You can add your venue and configure its interactive seat layout above."
              : "Try searching with a different city or keyword."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map((v) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition group"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100">
                <Image
                  src={v.imageUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80"}
                  alt={v.name}
                  fill
                  className="object-cover transition duration-300 group-hover:scale-105"
                  unoptimized
                />
                <div className="absolute top-2.5 right-2.5 rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-bold text-white backdrop-blur-md flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-[#F84464]" /> {v.city}
                </div>
              </div>

              <div className="p-5 flex flex-1 flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-[#F84464] transition">
                    {v.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{v.address}</p>

                  <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-600 font-semibold">
                    <Users className="h-4 w-4 text-gray-400" />
                    Capacity: {v.capacity.toLocaleString()} seats
                  </div>

                  {v.amenities && v.amenities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {v.amenities.slice(0, 4).map((a) => (
                        <span
                          key={a}
                          className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700 capitalize"
                        >
                          {amenityIcons[a.toLowerCase()] ?? null} {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-medium">Interactive Layout Ready</span>
                  <Link
                    href={`/venues/${v.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#F84464] hover:underline"
                  >
                    View Seating Map <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VenuesPage() {
  return (
    <Suspense fallback={<div className="h-96 w-full animate-pulse bg-gray-100" />}>
      <VenuesContent />
    </Suspense>
  );
}
