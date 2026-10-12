import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, events, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { generateQRCodeBuffer } from "@/lib/qr";
import { generateTicketPDF } from "@/lib/pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const bookingId = Number(id);

    if (Number.isNaN(bookingId)) {
      return NextResponse.json({ error: "Invalid booking id" }, { status: 400 });
    }

    const [row] = await db
      .select({ booking: bookings, event: events, attendee: users })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (row.booking.userId !== user.id && user.role !== "organizer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const qrBuffer = await generateQRCodeBuffer(row.booking.reference);
    const pdfBuffer = await generateTicketPDF({
      eventTitle: row.event.title,
      eventDescription: row.event.description,
      eventLocation: row.event.location,
      eventDate: new Date(row.event.startsAt).toLocaleString(),
      attendeeName: row.attendee.name,
      attendeeEmail: row.attendee.email,
      reference: row.booking.reference,
      quantity: row.booking.quantity,
      qrBuffer,
    });

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ticket-${row.booking.reference}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Ticket download error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
