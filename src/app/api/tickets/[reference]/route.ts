import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, events, users, venues } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateQRCodeDataURL } from "@/lib/qr";
import { generateCode39DataUrl } from "@/lib/barcode";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const { reference } = await params;

    if (!reference) {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    const [row] = await db
      .select({
        booking: bookings,
        event: events,
        attendee: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(eq(bookings.reference, reference.trim().toUpperCase()))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const currentUser = await getCurrentUser();
    const isOwner = currentUser?.id === row.booking.userId;
    const isOrganizer = currentUser?.id === row.event.organizerId;

    // Generate real-time QR Code and Barcode Data URLs
    const qrDataUrl = await generateQRCodeDataURL(row.booking.reference);
    const barcodeDataUrl = generateCode39DataUrl(row.booking.reference, {
      height: 44,
      narrowBarWidth: 2,
      wideBarWidth: 5,
      includeText: true,
    });

    let seats: string[] = [];
    if (row.booking.seats) {
      try {
        seats = JSON.parse(row.booking.seats);
      } catch {
        seats = row.booking.seats.split(",").map((s) => s.trim());
      }
    }

    let venueDetails = null;
    if (row.event.venueId) {
      venueDetails = await db.query.venues.findFirst({
        where: eq(venues.id, row.event.venueId),
      });
    }

    return NextResponse.json({
      ticket: {
        id: row.booking.id,
        reference: row.booking.reference,
        status: row.booking.status,
        quantity: row.booking.quantity,
        totalCents: row.booking.totalCents,
        seats,
        refundStatus: row.booking.refundStatus,
        cancelledAt: row.booking.cancelledAt,
        createdAt: row.booking.createdAt,
        qrDataUrl,
        barcodeDataUrl,
        attendee: {
          name: isOwner || isOrganizer ? row.attendee.name : `${row.attendee.name[0]}***`,
          email: isOwner || isOrganizer ? row.attendee.email : `***@***.com`,
        },
        event: {
          id: row.event.id,
          title: row.event.title,
          description: row.event.description,
          category: row.event.category,
          location: row.event.location,
          startsAt: row.event.startsAt,
          endsAt: row.event.endsAt,
          imageUrl: row.event.imageUrl,
          venue: venueDetails
            ? {
                name: venueDetails.name,
                address: venueDetails.address,
                city: venueDetails.city,
              }
            : null,
        },
        isOwner,
        isOrganizer,
      },
    });
  } catch (error) {
    console.error("Get ticket pass error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
