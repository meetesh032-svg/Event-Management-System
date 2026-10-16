"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Calendar, Flame, Users } from "lucide-react";
import { formatRupees, formatPrice } from "@/lib/format";

export interface EventCardProps {
  id: number;
  title: string;
  category: string;
  location?: string | null;
  startsAt?: string | null;
  ticketPriceCents?: number;
  imageUrl?: string | null;
  ticketsRemaining?: number;
  capacity?: number;
  isTrending?: boolean;
  className?: string;
}

export function EventCard({
  id,
  title,
  category,
  location,
  startsAt,
  ticketPriceCents,
  imageUrl,
  ticketsRemaining,
  capacity,
  isTrending = false,
  className = "",
}: EventCardProps) {
  const isSoldOut = ticketsRemaining !== undefined && ticketsRemaining <= 0;
  const isScarcity = ticketsRemaining !== undefined && ticketsRemaining > 0 && ticketsRemaining <= 15;

  const formattedDate = startsAt
    ? new Date(startsAt).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Link
      href={`/events/${id}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:border-gray-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F84464] ${className}`}
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100">
        <Image
          src={imageUrl || "/placeholder-event.jpg"}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />

        {/* Category Pill */}
        <div className="absolute top-3 left-3 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white shadow-sm">
          {category}
        </div>

        {/* Trending / Scarcity Badge */}
        {isTrending && !isSoldOut && (
          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-[#F84464] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
            <Flame className="h-3 w-3 fill-white" />
            Trending
          </div>
        )}

        {isSoldOut && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center">
            <span className="rounded-xl bg-red-600/90 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-white shadow-lg">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Content Details */}
      <div className="p-4 flex flex-1 flex-col justify-between">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-gray-900 line-clamp-1 group-hover:text-[#F84464] transition-colors">
            {title}
          </h3>

          {location && (
            <p className="mt-1 text-xs text-gray-500 flex items-center gap-1.5 line-clamp-1">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span>{location}</span>
            </p>
          )}

          {formattedDate && (
            <p className="mt-1 text-xs text-gray-500 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span>{formattedDate}</span>
            </p>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-xs sm:text-sm font-black text-gray-900">
              {ticketPriceCents !== undefined ? formatRupees(ticketPriceCents) : "Free"}
            </div>
            {isScarcity && (
              <span className="text-[10px] font-semibold text-[#F84464]">
                Only {ticketsRemaining} left!
              </span>
            )}
          </div>

          <span className="rounded-lg bg-[#FFF0F3] px-3 py-1.5 text-xs font-bold text-[#F84464] transition-colors group-hover:bg-[#F84464] group-hover:text-white">
            {isSoldOut ? "Details" : "Book"}
          </span>
        </div>
      </div>
    </Link>
  );
}
