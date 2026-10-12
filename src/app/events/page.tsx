"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";

type EventItem = {
  id: number;
  title: string;
  category: string;
  imageUrl?: string | null;
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

function EventsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlCategory = searchParams.get("category") || "All";
  const urlSearch = searchParams.get("search") || "";

  const [events, setEvents] = useState<EventItem[]>([]);
  const [search, setSearch] = useState(urlSearch);
  const [category, setCategory] = useState(urlCategory);
  const [loading, setLoading] = useState(true);

  // Sync state if URL query params change (e.g. user clicked category in Navbar)
  useEffect(() => {
    const nextCat = searchParams.get("category") || "All";
    const nextSearch = searchParams.get("search") || "";
    setCategory(nextCat);
    setSearch(nextSearch);
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (category && category !== "All") params.set("category", category);

    setLoading(true);
    fetch(`/api/events?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setEvents(data.events ?? []))
      .finally(() => setLoading(false));
  }, [search, category]);

  const handleSelectCategory = (c: string) => {
    setCategory(c);
    const params = new URLSearchParams(searchParams.toString());
    if (c === "All") {
      params.delete("category");
    } else {
      params.set("category", c);
    }
    router.push(`/events?${params.toString()}`);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set("search", value.trim());
    } else {
      params.delete("search");
    }
    router.replace(`/events?${params.toString()}`);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Sub Header for Search and Filters */}
      <div className="bg-white border-b border-gray-200 py-4 shadow-sm sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 hidden-scrollbar">
            {categories.map((c) => {
              const isSelected = category.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  onClick={() => handleSelectCategory(c)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
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

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Filter by name..."
              className="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {category === "All" ? "Events in your city" : `${category} in your city`}
        </h1>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="w-full aspect-[2/3] bg-gray-200 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            <AnimatePresence>
              {events.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link href={`/events/${event.id}`} className="group block">
                    <div
                      className="w-full aspect-[2/3] rounded-lg bg-gray-200 bg-cover bg-center transition-transform duration-300 group-hover:shadow-md"
                      style={{ backgroundImage: `url(${event.imageUrl ?? "/placeholder-event.jpg"})` }}
                    />
                    <div className="mt-3">
                      <h3 className="text-base font-bold text-gray-900 truncate">{event.title}</h3>
                      <p className="mt-1 text-[13px] text-gray-500 font-medium">{event.category}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="py-20 text-center text-gray-500">
            No events found for {category !== "All" ? `"${category}"` : "your search"}. Try exploring other categories!
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
        <div className="bg-gray-50 min-h-screen p-10">
          <div className="mx-auto max-w-7xl animate-pulse space-y-6">
            <div className="h-10 w-48 bg-gray-200 rounded" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-gray-200 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <EventsPageContent />
    </Suspense>
  );
}
