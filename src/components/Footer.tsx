"use client";

import Link from "next/link";
import {
  Headphones,
  Ticket,
  ShieldCheck,
  Building,
  Mail,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

const majorCities = [
  "Mumbai",
  "Delhi-NCR",
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "Goa",
  "Jaipur",
  "Chandigarh",
  "Kochi",
];

const movieCategories = [
  "Action & Adventure",
  "Comedy",
  "Drama",
  "Sci-Fi",
  "Romantic",
  "Thriller",
];

const eventCategories = [
  "Music Concerts",
  "Standup Comedy",
  "Food & Drinks",
  "Tech Conferences",
  "Workshops & Masterclasses",
  "Nightlife & Parties",
];

export function Footer() {
  return (
    <footer className="w-full bg-[#333545] text-white pt-10 pb-8 mt-auto border-t border-[#44475a]">
      {/* 1. Host With Us Banner */}
      <div className="mx-auto max-w-7xl px-6 mb-10">
        <div className="rounded-2xl bg-gradient-to-r from-[#2B3148] to-[#1F2533] p-6 sm:p-8 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#F84464] text-white shadow-md shadow-[#F84464]/20">
              <Building className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                List your Show with Gatherly
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-gray-300">
                Got an event, comedy show, concert, or experience? Partner with us and reach millions of attendees.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/events/new"
            className="shrink-0 rounded-xl bg-[#F84464] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#E03252] hover:shadow-lg hover:shadow-[#F84464]/30"
          >
            List Your Show
          </Link>
        </div>
      </div>

      {/* 2. Customer Trust Highlights Bar */}
      <div className="border-y border-white/10 bg-[#2b2d3d] py-6 mb-10">
        <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-[#F84464]">
              <Headphones className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">24/7 Customer Care</h4>
              <p className="text-xs text-gray-400 mt-0.5">We are here to assist with bookings & gate entry anytime.</p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-[#F84464]">
              <Ticket className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Instant Resend & QR Passes</h4>
              <p className="text-xs text-gray-400 mt-0.5">Instant PDF passes & high-contrast vector gate barcodes.</p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-[#F84464]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">100% Genuine Guarantee</h4>
              <p className="text-xs text-gray-400 mt-0.5">Verified organizers with anti-fraud double booking protection.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navigation Columns */}
      <div className="mx-auto max-w-7xl px-6 grid grid-cols-2 md:grid-cols-4 gap-8 mb-10 text-xs">
        <div>
          <h4 className="font-bold text-sm text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
            Movies & Shows
          </h4>
          <ul className="space-y-2.5 text-gray-300">
            {movieCategories.map((item) => (
              <li key={item}>
                <Link
                  href={`/events?category=Movies`}
                  className="hover:text-[#F84464] transition-colors flex items-center gap-1"
                >
                  <ChevronRight className="h-3 w-3 text-gray-500" />
                  {item}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-sm text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
            Live Experiences
          </h4>
          <ul className="space-y-2.5 text-gray-300">
            {eventCategories.map((item) => (
              <li key={item}>
                <Link
                  href={`/events?category=${encodeURIComponent(item.split(" ")[0])}`}
                  className="hover:text-[#F84464] transition-colors flex items-center gap-1"
                >
                  <ChevronRight className="h-3 w-3 text-gray-500" />
                  {item}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-sm text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
            Venues & Locations
          </h4>
          <ul className="space-y-2.5 text-gray-300">
            <li>
              <Link href="/venues" className="hover:text-[#F84464] transition-colors flex items-center gap-1">
                <ChevronRight className="h-3 w-3 text-gray-500" />
                Explore Venues
              </Link>
            </li>
            <li>
              <Link href="/dashboard/venues/new" className="hover:text-[#F84464] transition-colors flex items-center gap-1">
                <ChevronRight className="h-3 w-3 text-gray-500" />
                Register Venue
              </Link>
            </li>
            <li>
              <Link href="/events?dateFilter=weekend" className="hover:text-[#F84464] transition-colors flex items-center gap-1">
                <ChevronRight className="h-3 w-3 text-gray-500" />
                Weekend Specials
              </Link>
            </li>
            <li>
              <Link href="/events?priceRange=free" className="hover:text-[#F84464] transition-colors flex items-center gap-1">
                <ChevronRight className="h-3 w-3 text-gray-500" />
                Free Community Events
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-sm text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
            Help & Account
          </h4>
          <ul className="space-y-2.5 text-gray-300">
            <li>
              <Link href="/bookings" className="hover:text-[#F84464] transition-colors flex items-center gap-1">
                <ChevronRight className="h-3 w-3 text-gray-500" />
                My Bookings & Tickets
              </Link>
            </li>
            <li>
              <Link href="/wishlist" className="hover:text-[#F84464] transition-colors flex items-center gap-1">
                <ChevronRight className="h-3 w-3 text-gray-500" />
                Saved Wishlist
              </Link>
            </li>
            <li>
              <Link href="/profile" className="hover:text-[#F84464] transition-colors flex items-center gap-1">
                <ChevronRight className="h-3 w-3 text-gray-500" />
                User Profile
              </Link>
            </li>
            <li>
              <Link href="/profile/security" className="hover:text-[#F84464] transition-colors flex items-center gap-1">
                <ChevronRight className="h-3 w-3 text-gray-500" />
                Account Security & MFA
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* 4. Popular Cities Row */}
      <div className="mx-auto max-w-7xl px-6 mb-8 pt-6 border-t border-white/10">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
          Popular Cities
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-400">
          {majorCities.map((city, index) => (
            <span key={city} className="flex items-center gap-3">
              <Link
                href={`/events?city=${encodeURIComponent(city.split("-")[0])}`}
                className="hover:text-white transition-colors"
              >
                {city}
              </Link>
              {index < majorCities.length - 1 && <span className="text-gray-600">|</span>}
            </span>
          ))}
        </div>
      </div>

      {/* 5. Copyright and Brand Strip */}
      <div className="mx-auto max-w-7xl px-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-xl font-bold tracking-tight text-white">
            Gather<span className="text-[#F84464]">ly</span>
          </Link>
          <span className="text-gray-500">© {new Date().getFullYear()} Gatherly Entertainment Pvt. Ltd. All Rights Reserved.</span>
        </div>

        <div className="flex items-center gap-6">
          <span className="text-gray-400">Secure Payments via UPI, Cards & NetBanking</span>
        </div>
      </div>
    </footer>
  );
}
