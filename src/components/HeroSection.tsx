"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Ticket, ShieldCheck, ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <div className="w-full bg-[#f8f9fa] py-4 sm:py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative w-full min-h-[300px] sm:min-h-[360px] md:min-h-[400px] overflow-hidden rounded-2xl bg-gradient-to-r from-[#1F2533] via-[#2B3148] to-[#141824] flex items-center shadow-xl border border-white/10"
        >
          {/* Content Box */}
          <div className="z-10 p-6 sm:p-10 md:p-16 text-white max-w-2xl">
            {/* Pill Header */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-[#FF8552] border border-white/10 mb-4 sm:mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              <span>India's Premier Entertainment Destination</span>
            </div>

            {/* Display Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-3 sm:mb-4">
              It All Starts <br className="hidden sm:inline" />
              <span className="text-gradient">Here.</span>
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base md:text-lg text-gray-300 max-w-lg mb-6 sm:mb-8 font-normal leading-relaxed">
              Discover the biggest blockbusters, live concerts, comedy nights, and stadium sporting events in your city.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <Link
                href="/events"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F84464] hover:bg-[#E03252] text-white font-bold text-sm sm:text-base px-6 py-3.5 transition-all shadow-lg shadow-[#F84464]/30 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Explore Events</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/venues"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm sm:text-base px-5 py-3.5 border border-white/20 transition-all backdrop-blur-md"
              >
                <span>Browse Venues</span>
              </Link>
            </div>

            {/* Trust Badges Bar */}
            <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-gray-300">
              <div className="flex items-center gap-1.5 font-medium">
                <Ticket className="h-4 w-4 text-[#F84464]" />
                <span>Instant Digital Passes</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>100% Genuine Guaranteed</span>
              </div>
            </div>
          </div>

          {/* Background Poster Visual with Gradient Fade */}
          <div
            className="absolute right-0 top-0 bottom-0 w-full sm:w-2/3 md:w-1/2 opacity-30 sm:opacity-75 pointer-events-none"
            style={{
              backgroundImage:
                "url(https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop)",
              backgroundSize: "cover",
              backgroundPosition: "center right",
              WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 50%)",
              maskImage: "linear-gradient(to right, transparent 0%, black 50%)",
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
