import Link from "next/link";
import { requireOrganizer } from "@/lib/auth";
import { db } from "@/db";
import { events, bookings } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { PlusCircle, Users, Ticket } from "lucide-react";
import DeleteEventButton from "./DeleteEventButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireOrganizer();

  const myEvents = await db
    .select({
      id: events.id,
      title: events.title,
      startsAt: events.startsAt,
      ticketsRemaining: events.ticketsRemaining,
      capacity: events.capacity,
      bookingsCount: sql<number>`count(${bookings.id})`.mapWith(Number),
    })
    .from(events)
    .leftJoin(bookings, eq(bookings.eventId, events.id))
    .where(eq(events.organizerId, user.id))
    .groupBy(events.id);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 bg-gray-50 min-h-screen">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Organizer Dashboard</h1>
          <p className="mt-1 text-gray-500">Manage your events and attendees.</p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="flex items-center gap-2 rounded-lg bg-[#F84464] px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 transition shadow-sm"
        >
          <PlusCircle className="h-4 w-4" /> New Event
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {myEvents.map((event) => (
          <div
            key={event.id}
            className="rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col justify-between p-6 transition hover:border-[#F84464]/30 hover:shadow-md"
          >
            <div>
              <h3 className="text-lg font-bold text-gray-900">{event.title}</h3>
              <p className="mt-1 text-sm text-gray-500 font-medium">
                {new Date(event.startsAt).toLocaleDateString()}
              </p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-500 font-medium">Capacity</p>
                <p className="font-semibold text-gray-900">{event.capacity}</p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-500 font-medium">Booked</p>
                <p className="font-semibold text-gray-900">{event.bookingsCount}</p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Link
                href={`/dashboard/events/${event.id}/attendees`}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <Users className="h-4 w-4" /> Attendees
              </Link>
              <DeleteEventButton eventId={event.id} />
            </div>
          </div>
        ))}
      </div>

      {myEvents.length === 0 && (
        <div className="mt-12 rounded-2xl border border-dashed border-gray-300 p-12 text-center text-gray-500 bg-white">
          <Ticket className="mx-auto mb-3 h-10 w-10 text-gray-400" />
          <p className="text-lg font-medium text-gray-900">No events yet</p>
          <p className="text-sm">Create your first event to start selling tickets.</p>
        </div>
      )}
    </div>
  );
}
