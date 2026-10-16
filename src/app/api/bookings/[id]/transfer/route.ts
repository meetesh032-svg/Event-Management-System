import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, users, seatReservations, ticketTransfers } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const bookingId = Number(id);

    if (isNaN(bookingId)) {
      return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
    }

    const body = await req.json();
    const { recipientEmail } = body;

    if (!recipientEmail || !recipientEmail.includes("@")) {
      return NextResponse.json(
        { error: "Valid recipient email address is required" },
        { status: 400 }
      );
    }

    const normalizedRecipient = recipientEmail.trim().toLowerCase();

    if (normalizedRecipient === user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Cannot transfer ticket to yourself" },
        { status: 400 }
      );
    }

    return await db.transaction(async (tx) => {
      // 1. Fetch current booking and verify ownership
      const booking = await tx.query.bookings.findFirst({
        where: eq(bookings.id, bookingId),
      });

      if (!booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      if (booking.userId !== user.id) {
        return NextResponse.json(
          { error: "You can only transfer your own tickets" },
          { status: 403 }
        );
      }

      if (booking.status !== "confirmed") {
        return NextResponse.json(
          { error: `Cannot transfer a booking with status: ${booking.status}` },
          { status: 400 }
        );
      }

      // 2. Find recipient user if exists
      const recipient = await tx.query.users.findFirst({
        where: eq(users.email, normalizedRecipient),
      });

      // 3. Generate a new secure ticket reference so old QR/barcode becomes invalid
      const newReference = `EVT-${Date.now()}-${crypto
        .randomBytes(3)
        .toString("hex")
        .toUpperCase()}`;

      const transferCode = `XFR-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;

      const newUserId = recipient ? recipient.id : user.id;

      // Update booking with new reference and recipient userId if exists
      const [updatedBooking] = await tx
        .update(bookings)
        .set({
          reference: newReference,
          userId: newUserId,
        })
        .where(eq(bookings.id, bookingId))
        .returning();

      // Transfer any associated seat reservations
      if (recipient) {
        await tx
          .update(seatReservations)
          .set({ userId: recipient.id })
          .where(
            and(
              eq(seatReservations.bookingId, bookingId),
              eq(seatReservations.userId, user.id)
            )
          );
      }

      // Record transfer in audit log
      await tx.insert(ticketTransfers).values({
        bookingId: booking.id,
        fromUserId: user.id,
        toUserEmail: normalizedRecipient,
        toUserId: recipient ? recipient.id : null,
        transferCode,
        status: "completed",
      });

      return NextResponse.json({
        success: true,
        message: recipient
          ? `Ticket successfully transferred to ${recipient.name} (${recipient.email})`
          : `Ticket reference re-issued and assigned to invite for ${normalizedRecipient}`,
        newReference,
        transferCode,
      });
    });
  } catch (error) {
    console.error("Ticket transfer error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
