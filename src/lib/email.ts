import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendTicketEmail({
  to,
  subject,
  html,
  pdfBuffer,
  reference,
}: {
  to: string;
  subject: string;
  html: string;
  pdfBuffer: Buffer;
  reference: string;
}) {
  if (!process.env.SMTP_HOST) {
    console.warn("SMTP_HOST not configured. Skipping email sending for local development.");
    return null;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      attachments: [
        {
          filename: `ticket-${reference}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    console.log("Ticket email sent:", info.messageId);
    return info;
  } catch (error) {
    console.warn("Failed to send email:", error);
    return null;
  }
}
