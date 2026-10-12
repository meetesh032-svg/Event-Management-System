"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export default function DeleteEventButton({ eventId }: { eventId: number }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this event? This action cannot be undone.")) return;
    
    setLoading(true);
    const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
    setLoading(false);

    if (res.ok) {
      router.refresh(); // Refresh the page to show the updated list
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete event");
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/20 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
    </button>
  );
}
