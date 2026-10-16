import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, events, users, receipts, orders } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { generateReceiptPDF } from "@/lib/receipt-pdf";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const bookingId = Number(id);

    if (isNaN(bookingId)) {
      return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
    }

    const [row] = await db
      .select({
        booking: bookings,
        event: events,
        attendee: users,
      })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (user && row.booking.userId !== user.id && user.role !== "admin" && user.role !== "organizer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const booking = row.booking;
    const event = row.event;
    const attendee = row.attendee;

    // Check if receipt record exists or query from receipts table
    const receiptRecord = await db.query.receipts.findFirst({
      where: eq(receipts.bookingId, bookingId),
    });

    const receiptNumber = receiptRecord?.receiptNumber || `RCP-${booking.reference}`;
    const transactionId = receiptRecord?.transactionId || booking.stripeSessionId;
    const gateway = receiptRecord?.gateway || "Online PG";
    const paymentMethod = receiptRecord?.paymentMethod || "Verified Gateway";

    let parsedSeats: string[] = [];
    if (booking.seats) {
      try {
        parsedSeats = JSON.parse(booking.seats);
      } catch {
        parsedSeats = booking.seats.split(",").map((s) => s.trim());
      }
    }

    const subtotalCents = event.ticketPriceCents * booking.quantity;
    const convenienceFeeCents = booking.totalCents > 0 ? 2500 : 0;
    const platformFeeCents = booking.totalCents > 0 ? 500 : 0;
    const taxesCents = booking.totalCents > 0 ? Math.round(((convenienceFeeCents + platformFeeCents) * 18) / 100) : 0;

    const pdfBuffer = await generateReceiptPDF({
      receiptNumber,
      bookingReference: booking.reference,
      transactionId,
      eventTitle: event.title,
      eventLocation: event.location,
      eventDate: new Date(event.startsAt).toLocaleString("en-IN"),
      attendeeName: booking.guestName || attendee.name,
      attendeeEmail: booking.guestEmail || attendee.email,
      quantity: booking.quantity,
      seats: parsedSeats,
      paymentMethod,
      gateway,
      subtotalCents,
      platformFeeCents,
      convenienceFeeCents,
      taxesCents,
      discountCents: booking.discountCents || 0,
      totalCents: booking.totalCents,
      issuedAt: receiptRecord?.issuedAt || booking.createdAt,
    });

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="receipt-${booking.reference}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Generate receipt error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
