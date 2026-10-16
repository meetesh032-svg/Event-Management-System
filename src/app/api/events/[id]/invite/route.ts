import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    : undefined,
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const eventId = Number(id);

    if (Number.isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const body = await req.json();
    const { emails, message } = body;

    const currentUser = await getCurrentUser();
    const inviterName = currentUser?.name || "A friend";

    const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const inviteLink = `${origin}/events/${eventId}?ref=${currentUser ? `user_${currentUser.id}` : "guest"}`;

    if (Array.isArray(emails) && emails.length > 0) {
      const emailList = emails.map((e: string) => e.trim()).filter((e: string) => e.includes("@"));

      for (const email of emailList) {
        if (process.env.SMTP_HOST) {
          await transporter.sendMail({
            from: process.env.EMAIL_FROM || "invites@gatherly.events",
            to: email,
            subject: `${inviterName} invited you to ${event.title}!`,
            html: `
              <div style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px;">
                <h2 style="color: #6366f1;">You're invited to ${event.title}</h2>
                <p>${inviterName} wants you to join them at <strong>${event.title}</strong>.</p>
                ${message ? `<p style="font-style: italic; background: #1e293b; padding: 12px; border-radius: 8px;">"${message}"</p>` : ""}
                <p>Location: ${event.location}<br/>Date: ${new Date(event.startsAt).toLocaleString()}</p>
                <a href="${inviteLink}" style="display: inline-block; background: #6366f1; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 12px;">Get Tickets</a>
              </div>
            `,
          }).catch((err) => console.warn("Error sending invite email:", err));
        } else {
          console.log(`[Simulated Invite Email] To: ${email} | Link: ${inviteLink}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      inviteLink,
      sentCount: Array.isArray(emails) ? emails.length : 0,
    });
  } catch (error) {
    console.error("Invite friends error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
