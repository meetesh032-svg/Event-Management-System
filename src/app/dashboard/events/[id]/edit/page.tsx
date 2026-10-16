"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Save, ExternalLink, Calendar, MapPin, Tag } from "lucide-react";

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

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [venuesList, setVenuesList] = useState<any[]>([]);

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

  useEffect(() => {
    // 1. Fetch Event
    fetch(`/api/events/${eventId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Event not found or unauthorized");
        const data = await res.json();
        const ev = data.event;
        setForm({
          title: ev.title || "",
          description: ev.description || "",
          category: ev.category || categories[0],
          location: ev.location || "",
          startsAt: ev.startsAt ? new Date(ev.startsAt).toISOString().slice(0, 16) : "",
          endsAt: ev.endsAt ? new Date(ev.endsAt).toISOString().slice(0, 16) : "",
          ticketPrice: ev.ticketPriceCents ? (ev.ticketPriceCents / 100).toString() : "0",
          capacity: ev.capacity ? ev.capacity.toString() : "0",
          imageUrl: ev.imageUrl || "",
          status: ev.status || "published",
          scheduledPublishAt: ev.scheduledPublishAt
            ? new Date(ev.scheduledPublishAt).toISOString().slice(0, 16)
            : "",
          venueId: ev.venueId ? ev.venueId.toString() : "",
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    // 2. Fetch Venues
    fetch("/api/venues")
      .then((res) => res.json())
      .then((data) => {
        if (data.venues) setVenuesList(data.venues);
      })
      .catch(() => {});
  }, [eventId]);

  const handleChange = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

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
        setSaving(false);
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

    const res = await fetch(`/api/events/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Could not update event");
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 1200);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-400 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <Link
            href={`/events/${eventId}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:underline"
          >
            Preview live page <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl"
        >
          <div className="border-b border-white/10 pb-6 mb-6">
            <h1 className="text-2xl font-bold text-white">Edit Event</h1>
            <p className="mt-1 text-sm text-slate-400">Update event details, publication status, and venue.</p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              ✓ Event updated successfully! Redirecting...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Publication Status Selector */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Publication Status
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "published", label: "Published (Live)", desc: "Visible to public & bookable" },
                  { id: "draft", label: "Draft (Hidden)", desc: "Only visible to you" },
                  { id: "scheduled", label: "Scheduled", desc: "Auto-publish on date" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleChange("status", s.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      form.status === s.id
                        ? "border-indigo-500 bg-indigo-500/20 text-white shadow-sm"
                        : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-xs font-bold text-white">{s.label}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{s.desc}</div>
                  </button>
                ))}
              </div>

              {form.status === "scheduled" && (
                <div className="mt-4 pt-3 border-t border-white/10">
                  <label className="mb-1 block text-xs text-indigo-300">Scheduled Launch Date & Time</label>
                  <input
                    type="datetime-local"
                    value={form.scheduledPublishAt}
                    onChange={(e) => handleChange("scheduledPublishAt", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-300">Event Title</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-300">Description</label>
                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                >
                  {categories.map((c) => (
                    <option key={c} value={c} className="bg-slate-900">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">Linked Venue (Optional)</label>
                <select
                  value={form.venueId}
                  onChange={(e) => handleChange("venueId", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                >
                  <option value="" className="bg-slate-900">-- No Venue (Custom Location) --</option>
                  {venuesList.map((v) => (
                    <option key={v.id} value={v.id} className="bg-slate-900">
                      {v.name} ({v.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-300">Location Address / City</label>
                <input
                  required
                  value={form.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">Starts At</label>
                <input
                  required
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => handleChange("startsAt", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">Ends At</label>
                <input
                  required
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => handleChange("endsAt", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">Ticket Price (₹)</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.ticketPrice}
                  onChange={(e) => handleChange("ticketPrice", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">Total Capacity</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={form.capacity}
                  onChange={(e) => handleChange("capacity", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-300">Event Banner Image</label>
                <div className="flex gap-4 items-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-indigo-500"
                  />
                  {form.imageUrl && (
                    <img
                      src={form.imageUrl}
                      alt="Banner Preview"
                      className="h-12 w-20 object-cover rounded-lg border border-white/10"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
              <Link
                href="/dashboard"
                className="rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10 transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 text-sm font-bold text-white transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
