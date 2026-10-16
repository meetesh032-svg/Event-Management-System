import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { bookings, events, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import AttendeeListClient from "./AttendeeListClient";

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

  const serializedRows = rows.map((r) => ({
    booking: {
      id: r.booking.id,
      reference: r.booking.reference,
      quantity: r.booking.quantity,
      totalCents: r.booking.totalCents,
      status: r.booking.status,
      seats: r.booking.seats,
      createdAt: r.booking.createdAt.toISOString(),
    },
    attendee: {
      name: r.attendee.name,
      email: r.attendee.email,
      phone: r.attendee.phone,
    },
  }));

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-400 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to organizer dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">{event.title}</h1>
          <p className="mt-1 text-slate-400">Manage attendees, filter registrations, and export customer data.</p>
        </div>

        <AttendeeListClient
          eventId={eventId}
          eventTitle={event.title}
          initialRows={serializedRows}
        />
      </div>
    </div>
  );
}
