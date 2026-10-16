"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const categories = [
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
  "Arts",
  "Other",
];

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: categories[0],
    location: "",
    startsAt: "",
    endsAt: "",
    ticketPrice: "",
    capacity: "",
    imageUrl: "",
    status: "published",
    scheduledPublishAt: "",
    venueId: "",
  });
  const [venuesList, setVenuesList] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/venues")
      .then((res) => res.json())
      .then((data) => {
        if (data.venues) setVenuesList(data.venues);
      })
      .catch(() => {});
  }, []);

  const handleChange = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    let uploadedImageUrl = form.imageUrl;

    if (imageFile) {
      const formData = new FormData();
      formData.append("file", imageFile);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        setError(uploadData.error || "Failed to upload image");
        setLoading(false);
        return;
      }
      uploadedImageUrl = uploadData.url;
    }

    const body = {
      ...form,
      imageUrl: uploadedImageUrl,
      ticketPriceCents: Math.round(Number(form.ticketPrice) * 100),
      capacity: Number(form.capacity),
      venueId: form.venueId ? Number(form.venueId) : null,
      scheduledPublishAt: form.status === "scheduled" && form.scheduledPublishAt ? form.scheduledPublishAt : null,
    };

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not create event");
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 bg-gray-50 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-2xl font-bold text-gray-900">Create a new event</h1>
        <p className="mt-2 text-sm text-gray-500">Fill in the details and start selling tickets.</p>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Status Selection */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <label className="mb-2 block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Publication Status
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "published", label: "Published", desc: "Live immediately" },
                { id: "draft", label: "Draft", desc: "Save without publishing" },
                { id: "scheduled", label: "Scheduled", desc: "Auto-publish on date" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleChange("status", s.id)}
                  className={`rounded-lg border p-3 text-left transition ${
                    form.status === s.id
                      ? "border-[#F84464] bg-rose-50 text-gray-900"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="text-xs font-bold">{s.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{s.desc}</div>
                </button>
              ))}
            </div>

            {form.status === "scheduled" && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <label className="mb-1 block text-xs text-gray-700">Scheduled Launch Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.scheduledPublishAt}
                  onChange={(e) => handleChange("scheduledPublishAt", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#F84464]"
                />
              </div>
            )}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700">Event title</label>
              <input
                required
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700">Description</label>
              <textarea
                required
                rows={4}
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Category</label>
              <select
                value={form.category}
                onChange={(e) => handleChange("category", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Venue (Optional)</label>
              <select
                value={form.venueId}
                onChange={(e) => {
                  handleChange("venueId", e.target.value);
                  const selectedVenue = venuesList.find((v) => v.id.toString() === e.target.value);
                  if (selectedVenue && !form.location) {
                    handleChange("location", `${selectedVenue.address}, ${selectedVenue.city}`);
                  }
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
              >
                <option value="">-- Custom Location (No Venue) --</option>
                {venuesList.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.city})
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700">Location</label>
              <input
                required
                value={form.location}
                onChange={(e) => handleChange("location", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Starts at</label>
              <input
                type="datetime-local"
                required
                value={form.startsAt}
                onChange={(e) => handleChange("startsAt", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Ends at</label>
              <input
                type="datetime-local"
                required
                value={form.endsAt}
                onChange={(e) => handleChange("endsAt", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Ticket price (₹ INR)</label>
              <input
                type="number"
                min="0"
                step="any"
                required
                placeholder="e.g. 499 (0 for Free)"
                value={form.ticketPrice}
                onChange={(e) => handleChange("ticketPrice", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Capacity</label>
              <input
                type="number"
                min="1"
                required
                value={form.capacity}
                onChange={(e) => handleChange("capacity", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700">Cover image</label>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-rose-50 file:text-[#F84464]
                    hover:file:bg-rose-100"
                />
                <span className="text-gray-400 text-sm font-semibold">OR</span>
                <input
                  placeholder="Paste URL instead (optional)"
                  value={form.imageUrl}
                  onChange={(e) => handleChange("imageUrl", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]"
                />
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#F84464] py-3 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60 shadow-sm transition"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish event"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
