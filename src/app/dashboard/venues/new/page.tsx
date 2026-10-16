"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  MapPin,
  Building2,
  Users,
  Grid,
  Loader2,
  ArrowLeft,
  Check,
  Accessibility,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const availableAmenities = [
  { id: "parking", label: "Valet & Dedicated Parking" },
  { id: "wifi", label: "High-Speed WiFi" },
  { id: "wheelchair", label: "Wheelchair Ramp & Accessible Seating" },
  { id: "food", label: "Food & Beverage Counters" },
  { id: "ac", label: "Central Air Conditioning" },
];

export default function NewVenuePage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Mumbai");
  const [state, setState] = useState("Maharashtra");
  const [capacity, setCapacity] = useState("1200");
  const [imageUrl, setImageUrl] = useState("");
  const [amenities, setAmenities] = useState<string[]>(["parking", "wheelchair", "ac"]);

  // Seat Layout Builder States
  const [rowsCount, setRowsCount] = useState(8);
  const [colsCount, setColsCount] = useState(10);
  const [vipRows, setVipRows] = useState<string[]>(["A", "B"]);
  const [accessibleSeats, setAccessibleSeats] = useState<string[]>(["H-1", "H-2", "H-9", "H-10"]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const rowLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").slice(0, rowsCount);

  const toggleAmenity = (id: string) => {
    if (amenities.includes(id)) {
      setAmenities(amenities.filter((a) => a !== id));
    } else {
      setAmenities([...amenities, id]);
    }
  };

  const toggleVipRow = (row: string) => {
    if (vipRows.includes(row)) {
      setVipRows(vipRows.filter((r) => r !== row));
    } else {
      setVipRows([...vipRows, row]);
    }
  };

  const toggleAccessibleSeat = (seatId: string) => {
    if (accessibleSeats.includes(seatId)) {
      setAccessibleSeats(accessibleSeats.filter((s) => s !== seatId));
    } else {
      setAccessibleSeats([...accessibleSeats, seatId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          address,
          city,
          state,
          capacity: parseInt(capacity, 10),
          imageUrl,
          amenities,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create venue");
        setLoading(false);
        return;
      }

      // Save custom seat layout for this venue
      if (data.venue?.id) {
        await fetch(`/api/venues/${data.venue.id}/layouts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${name} Seating Layout`,
            rows: rowsCount,
            cols: colsCount,
            vipRows,
            accessibleSeats,
          }),
        });

        router.push(`/venues/${data.venue.id}`);
      }
    } catch {
      setLoading(false);
      setError("Network error while creating venue.");
    }
  };

  if (user?.role !== "organizer" && user?.role !== "admin") {
    return (
      <div className="mx-auto max-w-xl py-24 text-center px-6">
        <h2 className="text-xl font-bold text-gray-900">Organizer Access Required</h2>
        <p className="mt-2 text-xs text-gray-500">
          Only verified event organizers and venue partners can configure venues.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-xl bg-[#F84464] px-6 py-2.5 text-xs font-semibold text-white hover:bg-rose-600 transition"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/venues"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-6 transition"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Venues
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Create Venue & Seat Layout</h1>
        <p className="mt-1 text-xs text-gray-500">
          Add an auditorium, stadium, or convention center and design its interactive seating chart.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Venue Details Card */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#F84464]" /> 1. Venue Location & Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Venue Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Royal Opera House"
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Total Capacity (Seats)</label>
              <input
                type="number"
                required
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="1000"
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Full Street Address</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Mama Parmanand Marg, Girgaon"
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Mumbai"
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Venue Image Poster URL</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Description / About</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Historic heritage theatre with state-of-the-art acoustics..."
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Venue Amenities</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {availableAmenities.map((a) => {
                const checked = amenities.includes(a.id);
                return (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => toggleAmenity(a.id)}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition text-left ${
                      checked
                        ? "border-[#F84464] bg-rose-50 text-[#F84464]"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded border ${
                        checked ? "border-[#F84464] bg-[#F84464] text-white" : "border-gray-300"
                      }`}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </div>
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step 2: Interactive Seat Layout Builder Card */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Grid className="h-4 w-4 text-[#F84464]" /> 2. Interactive Seat Layout Builder
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Configure row count, columns, VIP sections, and wheelchair accessibility.
              </p>
            </div>

            {/* Grid dimension sliders */}
            <div className="flex items-center gap-4 text-xs font-semibold">
              <label className="flex items-center gap-2">
                Rows:
                <select
                  value={rowsCount}
                  onChange={(e) => setRowsCount(parseInt(e.target.value, 10))}
                  className="rounded-lg border border-gray-300 px-2 py-1"
                >
                  {[6, 8, 10, 12, 14, 16].map((n) => (
                    <option key={n} value={n}>
                      {n} (A-{String.fromCharCode(64 + n)})
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2">
                Columns:
                <select
                  value={colsCount}
                  onChange={(e) => setColsCount(parseInt(e.target.value, 10))}
                  className="rounded-lg border border-gray-300 px-2 py-1"
                >
                  {[8, 10, 12, 14, 16].map((n) => (
                    <option key={n} value={n}>
                      {n} Seats / Row
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* VIP Rows Picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Select VIP Rows (Gold Tier):
            </label>
            <div className="flex flex-wrap gap-2">
              {rowLetters.map((r) => {
                const isVip = vipRows.includes(r);
                return (
                  <button
                    type="button"
                    key={r}
                    onClick={() => toggleVipRow(r)}
                    className={`h-7 w-7 rounded-lg text-xs font-bold transition ${
                      isVip
                        ? "bg-[#F59E0B] text-white shadow-xs"
                        : "border border-gray-300 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Live Layout Canvas */}
          <div className="rounded-2xl bg-gray-50 p-6 border border-gray-200">
            <div className="mx-auto max-w-sm text-center mb-6">
              <div className="rounded-lg bg-slate-800 text-white py-1.5 text-[10px] font-bold tracking-widest uppercase">
                STAGE / AUDITORIUM SCREEN
              </div>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="mx-auto flex flex-col items-center gap-1.5 min-w-[450px]">
                {rowLetters.map((row) => (
                  <div key={row} className="flex items-center gap-1.5">
                    <span className="w-5 text-center font-mono text-[11px] font-bold text-gray-400">
                      {row}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: colsCount }, (_, i) => i + 1).map((col) => {
                        const seatId = `${row}-${col}`;
                        const isVip = vipRows.includes(row);
                        const isAccessible = accessibleSeats.includes(seatId);

                        return (
                          <button
                            type="button"
                            key={seatId}
                            onClick={() => toggleAccessibleSeat(seatId)}
                            title={`Click to toggle wheelchair access: ${seatId}`}
                            className={`h-6 w-6 rounded-md text-[9px] font-bold text-white transition-transform hover:scale-110 flex items-center justify-center ${
                              isAccessible
                                ? "bg-[#10B981]"
                                : isVip
                                ? "bg-[#F59E0B]"
                                : "bg-[#3B82F6]"
                            }`}
                          >
                            {isAccessible ? <Accessibility className="h-3 w-3" /> : col}
                          </button>
                        );
                      })}
                    </div>

                    <span className="w-5 text-center font-mono text-[11px] font-bold text-gray-400">
                      {row}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200 flex flex-wrap justify-center items-center gap-4 text-[11px] font-semibold text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-[#F59E0B]" /> VIP Rows ({vipRows.join(", ") || "None"})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-[#3B82F6]" /> Standard Rows
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-[#10B981]" /> Wheelchair Accessible ({accessibleSeats.length} seats)
              </span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link
            href="/venues"
            className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-[#F84464] px-8 py-2.5 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-50 shadow-sm transition"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish Venue & Layout"}
          </button>
        </div>
      </form>
    </div>
  );
}
