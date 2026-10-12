"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function HeroSection() {
  return (
    <div className="w-full bg-[#f5f5f5] py-4">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full h-[250px] md:h-[350px] overflow-hidden rounded-xl bg-[#2B3148] flex items-center"
        >
          <div className="z-10 p-8 md:p-16 text-white max-w-xl">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Experience Live.</h1>
            <p className="text-base md:text-lg text-gray-300 mb-8">
              Discover the best movies, concerts, plays, and sporting events in your city.
            </p>
            <Link
              href="/events"
              className="bg-[#F84464] hover:bg-rose-600 text-white font-semibold py-3 px-8 rounded transition-colors shadow-sm"
            >
              Book Tickets Now
            </Link>
          </div>
          <div
            className="absolute right-0 top-0 bottom-0 w-2/3 md:w-1/2"
            style={{
              backgroundImage:
                "url(https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              WebkitMaskImage: "linear-gradient(to right, transparent, black 40%)",
              maskImage: "linear-gradient(to right, transparent, black 40%)",
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
