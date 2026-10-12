"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { Search, PlusCircle, LayoutDashboard, Ticket } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const navCategories = [
  { label: "Movies", category: "Movies" },
  { label: "Stream", category: "Stream" },
  { label: "Events", category: "Events" },
  { label: "Plays", category: "Plays" },
  { label: "Sports", category: "Sports" },
  { label: "Activities", category: "Activities" },
];

function NavbarCategories() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");

  return (
    <div className="flex items-center gap-6">
      {navCategories.map((item) => {
        const isActive =
          pathname === "/events" &&
          activeCategory?.toLowerCase() === item.category.toLowerCase();

        return (
          <Link
            key={item.category}
            href={`/events?category=${item.category}`}
            className={`transition py-1 border-b-2 font-medium text-sm ${
              isActive
                ? "border-[#F84464] text-[#F84464]"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

function NavbarCategoriesFallback() {
  return (
    <div className="flex items-center gap-6">
      {navCategories.map((item) => (
        <Link
          key={item.category}
          href={`/events?category=${item.category}`}
          className="text-gray-600 hover:text-gray-900 transition py-1 border-b-2 border-transparent font-medium text-sm"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export function Navbar() {
  const { user, setUser, logout } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, [setUser]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    logout();
    window.location.href = "/";
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/events?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="flex flex-col w-full z-50 shadow-sm">
      {/* Top Tier */}
      <div className="bg-[#333545] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8 flex-1">
            <Link href="/" className="flex items-center gap-1 text-2xl font-bold tracking-tight">
              Gather<span className="text-[#F84464]">ly</span>
            </Link>

            <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-xl relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for Movies, Events, Plays, Sports and Activities"
                className="w-full rounded-md border-none bg-white py-2 pl-10 pr-4 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-white/20"
              />
            </form>
          </div>

          <div className="flex items-center gap-4 ml-6">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Hi, {user.name.split(" ")[0]}</span>
                <button
                  onClick={handleLogout}
                  className="rounded bg-[#F84464] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-600"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded bg-[#F84464] px-5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-600"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Tier */}
      <div className="bg-[#f5f5f5] border-b border-gray-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2.5 text-sm text-gray-600">
          <Suspense fallback={<NavbarCategoriesFallback />}>
            <NavbarCategories />
          </Suspense>

          <div className="flex items-center gap-6 text-xs font-medium">
            {user?.role === "organizer" && (
              <>
                <Link href="/dashboard" className="flex items-center gap-1 hover:text-[#F84464] transition">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                <Link href="/dashboard/events/new" className="flex items-center gap-1 hover:text-[#F84464] transition">
                  <PlusCircle className="h-4 w-4" /> ListYourShow
                </Link>
              </>
            )}
            {user && (
              <Link href="/bookings" className="flex items-center gap-1 hover:text-[#F84464] transition">
                <Ticket className="h-4 w-4" /> My Tickets
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
