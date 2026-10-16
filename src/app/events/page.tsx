"use client";

import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  Calendar,
  Flame,
  CheckCircle,
  SlidersHorizontal,
  ArrowUpDown,
  Tag,
  Loader2,
  X,
} from "lucide-react";
import { formatRupees } from "@/lib/format";

type EventItem = {
  id: number;
  title: string;
  category: string;
  location: string;
  startsAt: string;
  ticketPriceCents: number;
  capacity: number;
  ticketsRemaining: number;
  imageUrl?: string | null;
  organizerName?: string | null;
  isVerifiedOrganizer?: boolean;
};

type OrganizerItem = {
  id: number;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  isVerifiedOrganizer: boolean;
  eventCount: number;
};

const categories = [
  "All",
  "Movies",
  "Stream",
  "Events",
  "Plays",
  "Sports",
  "Activities",
  "Music",
  "Tech",
  "Food",
  "Business",
];

const majorCities = [
  { label: "All Cities", value: "All" },
  { label: "Mumbai", value: "Mumbai" },
  { label: "Delhi-NCR", value: "Delhi" },
  { label: "Bengaluru", value: "Bengaluru" },
  { label: "Pune", value: "Pune" },
  { label: "Hyderabad", value: "Hyderabad" },
  { label: "Goa", value: "Goa" },
];

const priceOptions = [
  { label: "All Prices", value: "" },
  { label: "Free", value: "free" },
  { label: "Under ₹500", value: "under_500" },
  { label: "₹500 - ₹2,000", value: "500_2000" },
  { label: "Above ₹2,000", value: "above_2000" },
];

const dateOptions = [
  { label: "Any Date", value: "" },
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" },
  { label: "This Weekend", value: "weekend" },
];

function EventsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filters from URL
  const urlCategory = searchParams.get("category") || "All";
  const urlSearch = searchParams.get("search") || "";
  const urlCity = searchParams.get("city") || "All";
  const urlPrice = searchParams.get("priceRange") || "";
  const urlDate = searchParams.get("dateFilter") || "";
  const urlSort = searchParams.get("sort") || "soonest";

  const [events, setEvents] = useState<EventItem[]>([]);
  const [trending, setTrending] = useState<EventItem[]>([]);
  const [organizers, setOrganizers] = useState<OrganizerItem[]>([]);
  const [search, setSearch] = useState(urlSearch);
  const [category, setCategory] = useState(urlCategory);
  const [city, setCity] = useState(urlCity);
  const [priceRange, setPriceRange] = useState(urlPrice);
  const [dateFilter, setDateFilter] = useState(urlDate);
  const [sort, setSort] = useState(urlSort);
  const [loading, setLoading] = useState(true);

  // Sync state if URL changes
  useEffect(() => {
    setCategory(searchParams.get("category") || "All");
    setSearch(searchParams.get("search") || "");
    setCity(searchParams.get("city") || "All");
    setPriceRange(searchParams.get("priceRange") || "");
    setDateFilter(searchParams.get("dateFilter") || "");
    setSort(searchParams.get("sort") || "soonest");
  }, [searchParams]);

  // Load discovery data (trending & popular organizers) once
  useEffect(() => {
    fetch("/api/events/discovery")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.trending) setTrending(data.trending);
        if (data?.popularOrganizers) setOrganizers(data.popularOrganizers);
      })
      .catch(() => {});
  }, []);

  // Fetch catalog events on filter change
  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (category && category !== "All") params.set("category", category);
    if (city && city !== "All") params.set("city", city);
    if (priceRange) params.set("priceRange", priceRange);
    if (dateFilter) params.set("dateFilter", dateFilter);
    if (sort && sort !== "soonest") params.set("sort", sort);

    setLoading(true);
    fetch(`/api/events?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setEvents(data.events ?? []))
      .finally(() => setLoading(false));
  }, [search, category, city, priceRange, dateFilter, sort]);

  const updateUrlParam = (key: string, val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!val || val === "All" || (key === "sort" && val === "soonest")) {
      params.delete(key);
    } else {
      params.set(key, val);
    }
    router.push(`/events?${params.toString()}`);
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      {/* Category Pills Header Bar */}
      <div className="bg-white border-b border-gray-200 py-3 shadow-sm sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between gap-4">
          <div className="flex gap-2 overflow-x-auto pb-1 hidden-scrollbar flex-1">
            {categories.map((c) => {
              const isSelected = category.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  onClick={() => {
                    setCategory(c);
                    updateUrlParam("category", c);
                  }}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-[#F84464] text-white shadow-sm"
                      : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>

          {/* City / Nearby Selector */}
          <div className="flex items-center gap-1.5 shrink-0">
            <MapPin className="h-4 w-4 text-[#F84464]" />
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                updateUrlParam("city", e.target.value);
              }}
              className="rounded-xl border border-gray-300 bg-white py-1.5 px-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-[#F84464]"
            >
              {majorCities.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-6">
        {/* Search, Filter & Sort Controls Row */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm mb-8 flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Smart Search Bar */}
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                updateUrlParam("search", e.target.value);
              }}
              placeholder="Search by show title, venue, or keywords..."
              className="w-full rounded-xl border border-gray-300 py-2 pl-10 pr-9 text-xs outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  updateUrlParam("search", "");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills: Price, Date, Sort */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Price Filter */}
            <select
              value={priceRange}
              onChange={(e) => {
                setPriceRange(e.target.value);
                updateUrlParam("priceRange", e.target.value);
              }}
              className="rounded-xl border border-gray-300 bg-white py-2 px-3 text-xs font-medium text-gray-700 outline-none focus:border-[#F84464]"
            >
              {priceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                updateUrlParam("dateFilter", e.target.value);
              }}
              className="rounded-xl border border-gray-300 bg-white py-2 px-3 text-xs font-medium text-gray-700 outline-none focus:border-[#F84464]"
            >
              {dateOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Sorting */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  updateUrlParam("sort", e.target.value);
                }}
                className="rounded-xl border border-gray-300 bg-white py-2 px-3 text-xs font-semibold text-gray-800 outline-none focus:border-[#F84464]"
              >
                <option value="soonest">Date: Soonest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
          </div>
        </div>

        {/* Trending Events Spotlight Strip (shown when no specific search active) */}
        {!search && category === "All" && city === "All" && trending.length > 0 && (
          <div className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500 text-white">
                  <Flame className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-black text-gray-900">Trending Now</h2>
              </div>
              <span className="text-xs font-semibold text-gray-500">Fast Selling Shows</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {trending.slice(0, 6).map((item) => (
                <Link
                  key={item.id}
                  href={`/events/${item.id}`}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition"
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100">
                    <Image
                      src={item.imageUrl || "/placeholder-event.jpg"}
                      alt={item.title}
                      fill
                      className="object-cover transition duration-300 group-hover:scale-105"
                      unoptimized
                    />
                    <div className="absolute top-2 left-2 rounded-full bg-rose-600 px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-sm">
                      Trending
                    </div>
                  </div>
                  <div className="p-3 flex flex-1 flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 line-clamp-1 group-hover:text-[#F84464]">
                        {item.title}
                      </h4>
                      <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{item.location}</p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold">
                      <span className="text-gray-900">{formatRupees(item.ticketPriceCents)}</span>
                      <span className="text-rose-500 text-[10px]">
                        {item.ticketsRemaining} left
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Main Event Catalog Grid */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {category !== "All" ? `${category} Shows` : "All Entertainment"} ({events.length})
          </h2>
          {(city !== "All" || priceRange || dateFilter) && (
            <button
              onClick={() => {
                setCity("All");
                setPriceRange("");
                setDateFilter("");
                router.push("/events");
              }}
              className="text-xs font-semibold text-[#F84464] hover:underline"
            >
              Reset all filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#F84464]" />
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <h3 className="text-base font-bold text-gray-900">No events found</h3>
            <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
              We couldn&apos;t find any events matching your selected criteria. Try adjusting your search query, location, or price filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <AnimatePresence>
              {events.map((evt) => (
                <motion.div
                  key={evt.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition"
                >
                  <Link href={`/events/${evt.id}`} className="block relative aspect-[3/4] w-full overflow-hidden bg-gray-100">
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
                  </Link>

                  <div className="p-4 flex flex-1 flex-col">
                    <Link href={`/events/${evt.id}`}>
                      <h3 className="font-bold text-gray-900 text-sm line-clamp-1 group-hover:text-[#F84464] transition">
                        {evt.title}
                      </h3>
                    </Link>

                    <p className="mt-1 text-xs text-gray-500 flex items-center gap-1 line-clamp-1">
                      <MapPin className="h-3 w-3 shrink-0 text-gray-400" /> {evt.location}
                    </p>

                    <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3 shrink-0 text-gray-400" />{" "}
                      {new Date(evt.startsAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs font-black text-gray-900">
                        {formatRupees(evt.ticketPriceCents)}
                      </span>
                      <Link
                        href={`/events/${evt.id}`}
                        className="rounded-xl bg-[#F84464] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 shadow-sm transition"
                      >
                        Book Now
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Popular Organizers Section */}
        {organizers.length > 0 && (
          <div className="mt-16 border-t border-gray-200 pt-10">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900">Popular Organizers</h3>
                <p className="text-xs text-gray-500">Verified hosts and entertainment creators.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              {organizers.map((org) => (
                <Link
                  key={org.id}
                  href={`/profile/${org.id}`}
                  className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm hover:shadow-md hover:border-[#F84464]/30 transition group"
                >
                  <div className="relative h-14 w-14 rounded-full overflow-hidden border-2 border-gray-200 group-hover:border-[#F84464] mb-2 bg-slate-100 flex items-center justify-center">
                    {org.avatarUrl ? (
                      <Image
                        src={org.avatarUrl}
                        alt={org.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="font-bold text-gray-500 text-sm">
                        {org.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 line-clamp-1 group-hover:text-[#F84464] transition">
                    {org.name}
                  </h4>
                  <div className="flex items-center gap-1 mt-0.5">
                    {org.isVerifiedOrganizer && (
                      <CheckCircle className="h-3 w-3 fill-blue-600 text-white" />
                    )}
                    <span className="text-[10px] text-gray-400 font-medium">
                      {org.eventCount} {org.eventCount === 1 ? "show" : "shows"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-[#F84464]" />
        </div>
      }
    >
      <EventsPageContent />
    </Suspense>
  );
}
