import PDFDocument from "pdfkit";

export interface ReceiptPdfData {
  receiptNumber: string;
  invoiceNumber?: string;
  bookingReference: string;
  transactionId: string;
  eventTitle: string;
  eventLocation: string;
  eventDate: string;
  attendeeName: string;
  attendeeEmail: string;
  quantity: number;
  seats?: string[] | null;
  paymentMethod: string;
  gateway: string;
  subtotalCents: number;
  platformFeeCents: number;
  convenienceFeeCents: number;
  taxesCents: number;
  discountCents: number;
  totalCents: number;
  issuedAt: Date;
}

export function generateReceiptPDF(data: ReceiptPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header Band
    doc.rect(40, 40, 515, 60).fill("#064e3b"); // Deep emerald for receipt
    doc.fillColor("#ffffff").fontSize(22).font("Helvetica-Bold").text("OFFICIAL PAYMENT RECEIPT", 60, 58);
    doc.fontSize(10).font("Helvetica").text("PAYMENT ACKNOWLEDGEMENT", 380, 64, { align: "right" });

    // Meta details
    const topY = 120;
    doc.fillColor("#0f172a").fontSize(11).font("Helvetica-Bold").text("Receipt Information", 50, topY);
    doc.font("Helvetica").fontSize(9).fillColor("#475569");
    doc.text(`Receipt No: ${data.receiptNumber}`, 50, topY + 16);
    doc.text(`Issued Date: ${data.issuedAt.toLocaleDateString("en-IN")}`, 50, topY + 30);
    doc.text(`Booking Ref: ${data.bookingReference}`, 50, topY + 44);
    doc.text(`Gateway Txn ID: ${data.transactionId}`, 50, topY + 58);

    doc.fillColor("#0f172a").fontSize(11).font("Helvetica-Bold").text("Paid By", 340, topY);
    doc.font("Helvetica").fontSize(9).fillColor("#475569");
    doc.text(`Name: ${data.attendeeName}`, 340, topY + 16);
    doc.text(`Email: ${data.attendeeEmail}`, 340, topY + 30);
    doc.text(`Payment Gateway: ${data.gateway.toUpperCase()}`, 340, topY + 44);
    doc.text(`Payment Instrument: ${data.paymentMethod.toUpperCase()}`, 340, topY + 58);

    // Table Header
    const tableY = 210;
    doc.rect(40, tableY, 515, 24).fill("#f1f5f9");
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(9);
    doc.text("ITEM / SHOW DESCRIPTION", 50, tableY + 7);
    doc.text("QTY", 320, tableY + 7);
    doc.text("METHOD", 380, tableY + 7);
    doc.text("AMOUNT", 480, tableY + 7);

    // Row 1
    let rowY = tableY + 34;
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a").text(data.eventTitle, 50, rowY);
    doc.font("Helvetica").fontSize(8).fillColor("#64748b");
    doc.text(`Date: ${data.eventDate} | Venue: ${data.eventLocation}`, 50, rowY + 14);

    if (data.seats && data.seats.length > 0) {
      doc.fillColor("#059669").text(`Assigned Seats: ${data.seats.join(", ")}`, 50, rowY + 26);
      rowY += 12;
    }

    const subtotalFormatted = `₹${(data.subtotalCents / 100).toLocaleString("en-IN")}`;
    const totalFormatted = `₹${(data.totalCents / 100).toLocaleString("en-IN")}`;

    doc.font("Helvetica").fontSize(9).fillColor("#0f172a");
    doc.text(`${data.quantity}`, 320, rowY - 12);
    doc.text(data.gateway.toUpperCase(), 380, rowY - 12);
    doc.text(subtotalFormatted, 480, rowY - 12);

    rowY += 36;
    doc.strokeColor("#e2e8f0").moveTo(40, rowY).lineTo(555, rowY).stroke();

    // Financial Breakdown
    rowY += 15;
    const calcX = 350;
    const valX = 480;

    doc.fontSize(9).font("Helvetica").fillColor("#475569").text("Ticket Subtotal:", calcX, rowY);
    doc.text(subtotalFormatted, valX, rowY);

    if (data.discountCents > 0) {
      rowY += 16;
      doc.fillColor("#16a34a").text("Discount Applied:", calcX, rowY);
      doc.text(`- ₹${(data.discountCents / 100).toLocaleString("en-IN")}`, valX, rowY);
    }

    if (data.platformFeeCents > 0) {
      rowY += 16;
      doc.fillColor("#475569").text("Platform Fee:", calcX, rowY);
      doc.text(`₹${(data.platformFeeCents / 100).toLocaleString("en-IN")}`, valX, rowY);
    }

    if (data.convenienceFeeCents > 0) {
      rowY += 16;
      doc.fillColor("#475569").text("Convenience Fee:", calcX, rowY);
      doc.text(`₹${(data.convenienceFeeCents / 100).toLocaleString("en-IN")}`, valX, rowY);
    }

    if (data.taxesCents > 0) {
      rowY += 16;
      doc.fillColor("#475569").text("Taxes (18% GST):", calcX, rowY);
      doc.text(`₹${(data.taxesCents / 100).toLocaleString("en-IN")}`, valX, rowY);
    }

    rowY += 22;
    doc.rect(calcX - 10, rowY - 5, 215, 28).fill("#ecfdf5");
    doc.fillColor("#065f46").font("Helvetica-Bold").fontSize(11).text("Net Amount Received:", calcX, rowY + 4);
    doc.text(totalFormatted, valX, rowY + 4);

    // Paid Stamp Badge
    doc.rect(50, 480, 160, 45).strokeColor("#059669").lineWidth(2).stroke();
    doc.fillColor("#059669").font("Helvetica-Bold").fontSize(15).text("PAYMENT RECEIVED", 58, 495);

    // Legal / Compliance notice
    doc.fontSize(8).font("Helvetica").fillColor("#94a3b8").text(
      "This computer-generated payment receipt confirms full receipt of funds through an official authorized payment gateway. Retain this for your records.",
      50,
      740,
      { align: "center", width: 500 }
    );

    doc.end();
  });
}
