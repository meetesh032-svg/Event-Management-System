import PDFDocument from "pdfkit";

export type TicketPdfData = {
  eventTitle: string;
  eventDescription: string;
  eventLocation: string;
  eventDate: string;
  attendeeName: string;
  attendeeEmail: string;
  reference: string;
  quantity: number;
  qrBuffer: Buffer;
};

export function generateTicketPDF(data: TicketPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc.fontSize(28).fillColor("#4f46e5").text("Evently E-Ticket", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor("#64748b").text(`Booking reference: ${data.reference}`, {
      align: "center",
    });
    doc.moveDown(1.5);

    // Event card background
    doc.rect(50, doc.y, 495, 220).fillAndStroke("#f8fafc", "#e2e8f0");
    const cardTop = doc.y;

    doc.fillColor("#0f172a").fontSize(20).text(data.eventTitle, 70, cardTop + 20);
    doc.fontSize(12).fillColor("#475569").text(data.eventDescription, {
      width: 455,
      lineGap: 4,
    });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor("#0f172a").text(`Location: ${data.eventLocation}`);
    doc.moveDown(0.3);
    doc.text(`Date: ${data.eventDate}`);
    doc.moveDown(0.3);
    doc.text(`Quantity: ${data.quantity}`);

    // Attendee block
    doc.moveDown(2);
    doc.fontSize(14).fillColor("#0f172a").text(`Attendee: ${data.attendeeName}`);
    doc.fontSize(12).fillColor("#475569").text(data.attendeeEmail);

    // QR code
    doc.moveDown(1.5);
    doc.image(data.qrBuffer, (doc.page.width - 200) / 2, doc.y, {
      width: 200,
      height: 200,
    });
    doc.moveDown(12);
    doc.fontSize(11).fillColor("#64748b").text("Scan this QR code at the venue entrance.", {
      align: "center",
    });

    doc.end();
  });
}
