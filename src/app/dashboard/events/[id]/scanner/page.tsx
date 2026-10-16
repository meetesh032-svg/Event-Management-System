import { notFound } from "next/navigation";
import { requireOrganizer } from "@/lib/auth";
import { db } from "@/db";
import { events, bookings } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import ScannerClient from "./ScannerClient";

export const dynamic = "force-dynamic";

export default async function ScannerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrganizer();
  const { id } = await params;
  const eventId = Number(id);

  if (Number.isNaN(eventId)) notFound();

  const event = await db.query.events.findFirst({
    where: user.role === "admin" ? eq(events.id, eventId) : and(eq(events.id, eventId), eq(events.organizerId, user.id)),
  });

  if (!event) notFound();

  // Aggregate stats
  const [stats] = await db
    .select({
      ticketsSold: sql<number>`COALESCE(SUM(CASE WHEN ${bookings.status} = 'confirmed' THEN ${bookings.quantity} ELSE 0 END), 0)`.mapWith(Number),
      checkedInCount: sql<number>`COALESCE(SUM(CASE WHEN ${bookings.status} = 'confirmed' AND ${bookings.isCheckedIn} = true THEN ${bookings.quantity} ELSE 0 END), 0)`.mapWith(Number),
    })
    .from(bookings)
    .where(eq(bookings.eventId, eventId));

  const ticketsSold = stats?.ticketsSold || 0;
  const checkedInCount = stats?.checkedInCount || 0;
  const remainingCount = Math.max(0, ticketsSold - checkedInCount);
  const attendanceRate = ticketsSold > 0 ? Math.round((checkedInCount / ticketsSold) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <ScannerClient
          eventId={event.id}
          eventTitle={event.title}
          initialStats={{
            capacity: event.capacity,
            ticketsSold,
            checkedInCount,
            remainingCount,
            attendanceRate,
          }}
        />
      </div>
    </div>
  );
}
