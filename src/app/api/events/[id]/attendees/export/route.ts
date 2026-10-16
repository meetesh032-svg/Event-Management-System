import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, bookings, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireOrganizer } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireOrganizer();
    const { id } = await params;
    const eventId = Number(id);

    if (Number.isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.organizerId, user.id)),
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found or unauthorized" }, { status: 404 });
    }

    const rows = await db
      .select({
        booking: bookings,
        attendee: users,
      })
      .from(bookings)
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(eq(bookings.eventId, eventId))
      .orderBy(bookings.createdAt);

    // Build CSV
    const headers = [
      "Booking Reference",
      "Attendee Name",
      "Attendee Email",
      "Attendee Phone",
      "Quantity",
      "Seats",
      "Total (INR)",
      "Coupon Used",
      "Status",
      "Booked At",
    ];

    const csvRows = [headers.join(",")];

    for (const r of rows) {
      const seatsFormatted = r.booking.seats ? `"${r.booking.seats.replace(/"/g, '""')}"` : '""';
      const row = [
        `"${r.booking.reference}"`,
        `"${r.attendee.name.replace(/"/g, '""')}"`,
        `"${r.attendee.email}"`,
        `"${r.attendee.phone || ""}"`,
        r.booking.quantity,
        seatsFormatted,
        (r.booking.totalCents / 100).toFixed(2),
        `"${r.booking.couponCode || ""}"`,
        `"${r.booking.status}"`,
        `"${new Date(r.booking.createdAt).toISOString()}"`,
      ];
      csvRows.push(row.join(","));
    }

    const csvContent = csvRows.join("\n");
    const sanitizedTitle = event.title.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${sanitizedTitle}_attendees.csv"`,
      },
    });
  } catch (error) {
    console.error("Export attendees error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
