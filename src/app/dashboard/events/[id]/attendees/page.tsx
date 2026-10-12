import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { bookings, events, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ArrowLeft, Mail, Ticket } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AttendeesPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const eventId = Number(id);

  if (Number.isNaN(eventId)) notFound();

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });

  if (!event || event.organizerId !== user.id) {
    notFound();
  }

  const rows = await db
    .select({ booking: bookings, attendee: users })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .where(eq(bookings.eventId, eventId))
    .orderBy(bookings.createdAt);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-indigo-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{event.title}</h1>
        <p className="mt-1 text-slate-400">Attendee list & booking references</p>
      </div>

      <div className="glass-strong overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-slate-300">
            <tr>
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Email</th>
              <th className="px-6 py-4 font-medium">Reference</th>
              <th className="px-6 py-4 font-medium">Booked</th>
              <th className="px-6 py-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.booking.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                <td className="px-6 py-4 font-medium">{row.attendee.name}</td>
                <td className="px-6 py-4">
                  <a
                    href={`mailto:${row.attendee.email}`}
                    className="inline-flex items-center gap-1 text-indigo-300 hover:text-indigo-200"
                  >
                    <Mail className="h-3.5 w-3.5" /> {row.attendee.email}
                  </a>
                </td>
                <td className="px-6 py-4 font-mono text-xs">{row.booking.reference}</td>
                <td className="px-6 py-4 text-slate-400">
                  {new Date(row.booking.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
                    <Ticket className="h-3 w-3" /> {row.booking.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="py-12 text-center text-slate-400">No bookings yet.</div>
        )}
      </div>
    </div>
  );
}
