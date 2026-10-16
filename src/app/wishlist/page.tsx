"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Trash2, Calendar, MapPin, Loader2, ArrowRight } from "lucide-react";
import { formatRupees } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";

type FavoriteItem = {
  favoriteId: number;
  favoritedAt: string;
  event: {
    id: number;
    title: string;
    description: string;
    category: string;
    location: string;
    startsAt: string;
    ticketPriceCents: number;
    ticketsRemaining: number;
    imageUrl: string | null;
  };
};

export default function WishlistPage() {
  const { user } = useAuthStore();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    try {
      const res = await fetch("/api/favorites");
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favorites || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleRemoveFavorite = async (eventId: number) => {
    try {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      setFavorites(favorites.filter((f) => f.event.id !== eventId));
    } catch {
      // ignore
    }
  };

  if (!user && !loading) {
    return (
      <div className="mx-auto max-w-xl py-24 text-center px-6">
        <h2 className="text-xl font-bold text-gray-900">Sign In Required</h2>
        <p className="mt-2 text-xs text-gray-500">
          Please sign in to view your saved events wishlist.
        </p>
        <Link
          href="/login?redirect=/wishlist"
          className="mt-6 inline-block rounded-xl bg-[#F84464] px-6 py-2.5 text-xs font-semibold text-white hover:bg-rose-600 transition"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <Heart className="h-6 w-6 text-[#F84464] fill-[#F84464]" /> My Wishlist
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Events and shows you have saved for later booking.
          </p>
        </div>
        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-[#F84464]">
          {favorites.length} saved
        </span>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#F84464]" />
        </div>
      ) : favorites.length === 0 ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-[#F84464] mb-4">
            <Heart className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-gray-900">Your Wishlist is Empty</h3>
          <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
            Discover upcoming movies, concerts, sports tournaments, and plays and tap the heart icon to save them here!
          </p>
          <Link
            href="/events"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#F84464] px-6 py-2.5 text-xs font-semibold text-white hover:bg-rose-600 shadow-sm transition"
          >
            Explore Catalog <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {favorites.map(({ event: evt }) => (
            <motion.div
              key={evt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100">
                <Image
                  src={evt.imageUrl || "/placeholder-event.jpg"}
                  alt={evt.title}
                  fill
                  className="object-cover transition duration-300 group-hover:scale-105"
                  unoptimized
                />
                <button
                  onClick={() => handleRemoveFavorite(evt.id)}
                  title="Remove from wishlist"
                  className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-rose-600 shadow-sm hover:bg-white hover:scale-110 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="absolute bottom-2.5 left-2.5 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                  {evt.category}
                </div>
              </div>

              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-bold text-gray-900 text-sm line-clamp-1 group-hover:text-[#F84464] transition">
                  {evt.title}
                </h3>
                <p className="mt-1 text-xs text-gray-500 flex items-center gap-1 line-clamp-1">
                  <MapPin className="h-3 w-3 shrink-0 text-gray-400" /> {evt.location}
                </p>
                <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="h-3 w-3 shrink-0 text-gray-400" />{" "}
                  {new Date(evt.startsAt).toLocaleDateString()}
                </p>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase text-gray-400 block font-semibold">Price</span>
                    <span className="text-xs font-black text-gray-900">
                      {formatRupees(evt.ticketPriceCents)}
                    </span>
                  </div>
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
        </div>
      )}
    </div>
  );
}
