import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, events, users, venues } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import PDFDocument from "pdfkit";

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

    let parsedSeats: string[] = [];
    if (booking.seats) {
      try {
        parsedSeats = JSON.parse(booking.seats);
      } catch {
        parsedSeats = booking.seats.split(",").map((s) => s.trim());
      }
    }

    // Generate Invoice PDF
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header Bar
      doc.rect(40, 40, 515, 60).fill("#1e1b4b");
      doc.fillColor("#ffffff").fontSize(22).font("Helvetica-Bold").text("GATHERLY TAX INVOICE", 60, 58);
      doc.fontSize(10).font("Helvetica").text("ORIGINAL FOR RECIPIENT", 400, 64, { align: "right" });

      // Invoice Meta info
      doc.moveDown(3);
      const topY = 120;
      doc.fillColor("#0f172a").fontSize(11).font("Helvetica-Bold").text("Invoice Details", 50, topY);
      doc.font("Helvetica").fontSize(9).fillColor("#475569");
      doc.text(`Invoice No: INV-${booking.reference}`, 50, topY + 16);
      doc.text(`Invoice Date: ${new Date(booking.createdAt).toLocaleDateString("en-IN")}`, 50, topY + 30);
      doc.text(`Payment Reference: ${booking.stripeSessionId}`, 50, topY + 44);

      // Billed To info
      doc.fillColor("#0f172a").fontSize(11).font("Helvetica-Bold").text("Billed To", 340, topY);
      doc.font("Helvetica").fontSize(9).fillColor("#475569");
      doc.text(`Name: ${booking.guestName || attendee.name}`, 340, topY + 16);
      doc.text(`Email: ${booking.guestEmail || attendee.email}`, 340, topY + 30);
      doc.text(`Customer ID: USR-${booking.userId}`, 340, topY + 44);

      // Line Items Table Header
      const tableY = 200;
      doc.rect(40, tableY, 515, 24).fill("#f1f5f9");
      doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(9);
      doc.text("ITEM / DESCRIPTION", 50, tableY + 7);
      doc.text("QTY", 320, tableY + 7);
      doc.text("UNIT PRICE", 380, tableY + 7);
      doc.text("AMOUNT", 480, tableY + 7);

      // Row 1: Event Ticket
      let rowY = tableY + 34;
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a").text(event.title, 50, rowY);
      doc.font("Helvetica").fontSize(8).fillColor("#64748b");
      doc.text(`Date: ${new Date(event.startsAt).toLocaleString("en-IN")} | Venue: ${event.location}`, 50, rowY + 14);

      if (parsedSeats.length > 0) {
        doc.fillColor("#4338ca").text(`Assigned Seats: ${parsedSeats.join(", ")}`, 50, rowY + 26);
        rowY += 12;
      }

      const unitPriceFormatted = `Rs. ${(event.ticketPriceCents / 100).toLocaleString("en-IN")}`;
      const subtotalCents = event.ticketPriceCents * booking.quantity;
      const subtotalFormatted = `Rs. ${(subtotalCents / 100).toLocaleString("en-IN")}`;

      doc.font("Helvetica").fontSize(9).fillColor("#0f172a");
      doc.text(`${booking.quantity}`, 320, rowY - 12);
      doc.text(unitPriceFormatted, 380, rowY - 12);
      doc.text(subtotalFormatted, 480, rowY - 12);

      // Divider
      rowY += 40;
      doc.strokeColor("#e2e8f0").moveTo(40, rowY).lineTo(555, rowY).stroke();

      // Calculation Breakdown
      rowY += 15;
      const calcX = 350;
      const valX = 480;

      doc.fontSize(9).font("Helvetica").fillColor("#475569").text("Subtotal:", calcX, rowY);
      doc.text(subtotalFormatted, valX, rowY);

      if (booking.discountCents > 0) {
        rowY += 16;
        doc.fillColor("#16a34a").text(`Promo Discount (${booking.couponCode || "Coupon"}):`, calcX, rowY);
        doc.text(`- Rs. ${(booking.discountCents / 100).toLocaleString("en-IN")}`, valX, rowY);
      }

      rowY += 16;
      const gstCents = Math.round(booking.totalCents * 0.18 / 1.18);
      doc.fillColor("#475569").text("GST (18% inclusive):", calcX, rowY);
      doc.text(`Rs. ${(gstCents / 100).toLocaleString("en-IN")}`, valX, rowY);

      rowY += 22;
      doc.rect(calcX - 10, rowY - 5, 215, 28).fill("#f8fafc");
      doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11).text("Grand Total Paid:", calcX, rowY + 4);
      doc.text(`Rs. ${(booking.totalCents / 100).toLocaleString("en-IN")}`, valX, rowY + 4);

      // Paid Stamp Badge
      doc.rect(50, 480, 140, 45).strokeColor("#16a34a").lineWidth(2).stroke();
      doc.fillColor("#16a34a").font("Helvetica-Bold").fontSize(16).text("PAID IN FULL", 65, 495);

      // Footer
      doc.fontSize(8).font("Helvetica").fillColor("#94a3b8").text(
        "Thank you for booking with Gatherly! This is a computer-generated tax invoice and does not require a physical signature.",
        50,
        740,
        { align: "center", width: 500 }
      );

      doc.end();
    });

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${booking.reference}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Generate invoice error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
