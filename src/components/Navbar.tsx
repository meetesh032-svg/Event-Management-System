"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import {
  Search,
  PlusCircle,
  LayoutDashboard,
  Ticket,
  Shield,
  Heart,
  User,
  Building2,
  Gift,
  Menu,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { NotificationBell } from "./NotificationBell";
import { MarketingRewardsModal } from "./MarketingRewardsModal";

const navCategories = [
  { label: "Movies", category: "Movies" },
  { label: "Stream", category: "Stream" },
  { label: "Events", category: "Events" },
  { label: "Plays", category: "Plays" },
  { label: "Sports", category: "Sports" },
  { label: "Activities", category: "Activities" },
];

function NavbarCategories({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");

  return (
    <div className="flex items-center gap-6 overflow-x-auto hidden-scrollbar py-0.5">
      {navCategories.map((item) => {
        const isActive =
          pathname === "/events" &&
          activeCategory?.toLowerCase() === item.category.toLowerCase();

        return (
          <Link
            key={item.category}
            href={`/events?category=${item.category}`}
            onClick={onNavigate}
            className={`transition py-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
              isActive
                ? "border-[#F84464] text-[#F84464] font-bold"
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
    <div className="flex items-center gap-6 overflow-x-auto hidden-scrollbar py-0.5">
      {navCategories.map((item) => (
        <Link
          key={item.category}
          href={`/events?category=${item.category}`}
          className="text-gray-600 hover:text-gray-900 transition py-1 border-b-2 border-transparent font-medium text-xs sm:text-sm whitespace-nowrap"
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
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
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
    setMobileMenuOpen(false);
    window.location.href = "/";
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/events?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileSearchOpen(false);
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="flex flex-col w-full z-50 shadow-sm sticky top-0">
      {/* Top Tier */}
      <div className="bg-[#333545] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3">
          <div className="flex items-center gap-6 sm:gap-8 flex-1">
            <Link
              href="/"
              className="flex items-center gap-0.5 text-2xl font-black tracking-tight select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-lg px-1"
            >
              Gather<span className="text-[#F84464]">ly</span>
            </Link>

            {/* Desktop Search */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-xl relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for Movies, Events, Plays, Sports and Activities"
                className="w-full rounded-xl border border-transparent bg-white py-2 pl-10 pr-4 text-xs sm:text-sm text-gray-900 outline-none focus:border-[#F84464] focus:ring-2 focus:ring-[#F84464]/20 transition-all shadow-inner"
              />
            </form>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 ml-4">
            {/* Mobile Search Toggle */}
            <button
              type="button"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition"
              aria-label="Toggle mobile search"
            >
              <Search className="h-5 w-5" />
            </button>

            {user ? (
              <div className="flex items-center gap-2 sm:gap-4">
                <NotificationBell />
                <span className="hidden sm:inline text-xs sm:text-sm font-medium text-gray-200">
                  Hi, {user.name.split(" ")[0]}
                </span>
                <button
                  onClick={handleLogout}
                  className="hidden sm:inline-block rounded-xl bg-[#F84464] px-4 py-2 text-xs font-bold text-white transition-all hover:bg-[#E03252] shadow-sm"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden sm:inline-block rounded-xl bg-[#F84464] px-5 py-2 text-xs font-bold text-white transition-all hover:bg-[#E03252] shadow-sm"
              >
                Sign In
              </Link>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition"
              aria-label="Toggle navigation drawer"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Input Drawer (Visible when toggled) */}
        {mobileSearchOpen && (
          <div className="md:hidden px-4 pb-3 pt-1 border-t border-white/10 bg-[#2b2d3d]">
            <form onSubmit={handleSearch} className="relative flex items-center">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies, events, shows..."
                className="w-full rounded-xl border-none bg-white py-2 pl-10 pr-4 text-xs text-gray-900 outline-none"
              />
            </form>
          </div>
        )}
      </div>

      {/* Bottom Tier (Desktop & Tablet) */}
      <div className="bg-[#f8f9fa] border-b border-gray-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-2 text-xs sm:text-sm text-gray-600">
          <Suspense fallback={<NavbarCategoriesFallback />}>
            <NavbarCategories />
          </Suspense>

          <div className="hidden lg:flex items-center gap-5 text-xs font-semibold">
            <Link href="/venues" className="flex items-center gap-1 hover:text-[#F84464] transition">
              <Building2 className="h-3.5 w-3.5" /> Venues
            </Link>
            {user?.role === "admin" && (
              <Link href="/admin" className="flex items-center gap-1 text-rose-600 font-bold hover:text-rose-700 transition">
                <Shield className="h-3.5 w-3.5 text-rose-500" /> Admin Console
              </Link>
            )}
            {(user?.role === "organizer" || user?.role === "admin") && (
              <>
                <Link href="/dashboard" className="flex items-center gap-1 hover:text-[#F84464] transition">
                  <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
                </Link>
                <Link href="/dashboard/events/new" className="flex items-center gap-1 text-[#F84464] font-bold hover:underline transition">
                  <PlusCircle className="h-3.5 w-3.5" /> ListYourShow
                </Link>
              </>
            )}
            {user && (
              <>
                <Link href="/wishlist" className="flex items-center gap-1 hover:text-[#F84464] transition">
                  <Heart className="h-3.5 w-3.5" /> Wishlist
                </Link>
                <Link href="/bookings" className="flex items-center gap-1 hover:text-[#F84464] transition">
                  <Ticket className="h-3.5 w-3.5" /> My Tickets
                </Link>
                <Link href="/profile" className="flex items-center gap-1 hover:text-[#F84464] transition">
                  <User className="h-3.5 w-3.5" /> Profile
                </Link>
                <Link href="/profile/security" className="flex items-center gap-1 hover:text-[#F84464] transition">
                  <Shield className="h-3.5 w-3.5" /> Security
                </Link>
                <button
                  type="button"
                  onClick={() => setIsRewardsOpen(true)}
                  className="flex items-center gap-1 text-amber-600 font-bold hover:text-amber-700 transition"
                >
                  <Gift className="h-3.5 w-3.5 text-amber-500" /> Rewards
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-[52px] z-40 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white h-full w-4/5 max-w-xs shadow-2xl p-5 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              {/* User Identity Header in Drawer */}
              {user ? (
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-500 font-medium">Logged in as</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  <span className="inline-block mt-2 rounded-full bg-[#FFF0F3] px-2.5 py-0.5 text-[10px] font-bold text-[#F84464] uppercase">
                    {user.role}
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#FFF0F3] border border-[#F84464]/20">
                  <p className="text-xs font-bold text-[#F84464]">Welcome to Gatherly</p>
                  <p className="text-xs text-gray-600 mt-1">Sign in to book tickets and manage your reservations.</p>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mt-3 block text-center rounded-xl bg-[#F84464] py-2 text-xs font-bold text-white shadow-sm"
                  >
                    Sign In / Register
                  </Link>
                </div>
              )}

              {/* Navigation Links */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Explore</p>
                <div className="flex flex-col space-y-1">
                  <Link
                    href="/events"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 rounded-lg hover:bg-gray-100"
                  >
                    <Ticket className="h-4 w-4 text-gray-400" /> All Events & Shows
                  </Link>
                  <Link
                    href="/venues"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 rounded-lg hover:bg-gray-100"
                  >
                    <Building2 className="h-4 w-4 text-gray-400" /> Venues
                  </Link>
                </div>
              </div>

              {/* User Account Links */}
              {user && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">My Account</p>
                  <div className="flex flex-col space-y-1">
                    <Link
                      href="/bookings"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 rounded-lg hover:bg-gray-100"
                    >
                      <Ticket className="h-4 w-4 text-gray-400" /> My Bookings
                    </Link>
                    <Link
                      href="/wishlist"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 rounded-lg hover:bg-gray-100"
                    >
                      <Heart className="h-4 w-4 text-gray-400" /> Wishlist
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 rounded-lg hover:bg-gray-100"
                    >
                      <User className="h-4 w-4 text-gray-400" /> Profile Settings
                    </Link>
                    <Link
                      href="/profile/security"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 rounded-lg hover:bg-gray-100"
                    >
                      <Shield className="h-4 w-4 text-gray-400" /> Security & 2FA
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setIsRewardsOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-amber-600 rounded-lg hover:bg-amber-50"
                    >
                      <Gift className="h-4 w-4 text-amber-500" /> Loyalty & Rewards
                    </button>
                  </div>
                </div>
              )}

              {/* Host & Admin Links */}
              {(user?.role === "organizer" || user?.role === "admin") && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Host Center</p>
                  <div className="flex flex-col space-y-1">
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 rounded-lg hover:bg-gray-100"
                    >
                      <LayoutDashboard className="h-4 w-4 text-gray-400" /> Organizer Dashboard
                    </Link>
                    <Link
                      href="/dashboard/events/new"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#F84464] rounded-lg hover:bg-[#FFF0F3]"
                    >
                      <PlusCircle className="h-4 w-4" /> List Your Show
                    </Link>
                  </div>
                </div>
              )}

              {user?.role === "admin" && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-rose-500 mb-2">Administration</p>
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 rounded-lg hover:bg-rose-50"
                  >
                    <Shield className="h-4 w-4" /> Admin Console
                  </Link>
                </div>
              )}
            </div>

            {/* Logout button in drawer */}
            {user && (
              <div className="pt-6 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  className="w-full rounded-xl bg-gray-100 hover:bg-gray-200 py-2.5 text-xs font-bold text-gray-700 transition"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <MarketingRewardsModal
        isOpen={isRewardsOpen}
        onClose={() => setIsRewardsOpen(false)}
      />
    </header>
  );
}
