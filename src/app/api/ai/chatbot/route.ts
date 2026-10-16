import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { ilike, or, sql, desc } from "drizzle-orm";
import { formatPrice } from "@/lib/format";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const q = message.trim().toLowerCase();

    // 1. FAQ & Policy Intent Detection
    if (q.includes("refund") || q.includes("cancel") || q.includes("return")) {
      return NextResponse.json({
        reply: "You can cancel your booking and request an automated refund directly from your digital ticket pass page (/tickets/[reference]) up to 24 hours before the event starts. Refunds are credited back to your original payment method within 3-5 business days.",
        events: [],
      });
    }

    if (q.includes("seat") || q.includes("chair") || q.includes("vip") || q.includes("map")) {
      return NextResponse.json({
        reply: "Gatherly supports real-time interactive seat maps! When you open any event page, tap 'Select Seats & Book' to view tier colors (VIP, Premium, Standard, Accessible) with a 7-minute hold lock to prevent double bookings.",
        events: [],
      });
    }

    if (q.includes("ticket") && (q.includes("where") || q.includes("find") || q.includes("download") || q.includes("qr"))) {
      return NextResponse.json({
        reply: "Your tickets with dynamic QR codes, Barcodes, and downloadable PDF Tax Invoices are available under 'My Bookings' in your profile menu or at your custom reference URL (/tickets/[reference]). You will also receive an instant confirmation email.",
        events: [],
      });
    }

    if (q.includes("organizer") || q.includes("host") || q.includes("create event")) {
      return NextResponse.json({
        reply: "Want to host your own show? Switch to an Organizer account from your profile settings or head over to the Organizer Dashboard (/dashboard) to create events, design seat layouts, view gate check-in scanners, and track real-time revenue!",
        events: [],
      });
    }

    // 2. Event Discovery & Search Intent
    // Extract category keywords if present
    const categories = ["Music", "Tech", "Comedy", "Theatre", "Sports", "Food", "Workshop"];
    let detectedCategory = categories.find((c) => q.includes(c.toLowerCase()));

    // Search events in database
    const matchingEvents = await db
      .select({
        id: events.id,
        title: events.title,
        category: events.category,
        location: events.location,
        ticketPriceCents: events.ticketPriceCents,
        startsAt: events.startsAt,
        ticketsRemaining: events.ticketsRemaining,
        imageUrl: events.imageUrl,
      })
      .from(events)
      .where(
        or(
          ilike(events.title, `%${q}%`),
          ilike(events.description, `%${q}%`),
          ilike(events.location, `%${q}%`),
          detectedCategory ? ilike(events.category, `%${detectedCategory}%`) : undefined
        )
      )
      .orderBy(desc(events.createdAt))
      .limit(3);

    if (matchingEvents.length > 0) {
      const titles = matchingEvents.map((e) => `"${e.title}" (${formatPrice(e.ticketPriceCents)})`).join(", ");
      return NextResponse.json({
        reply: `I found ${matchingEvents.length} great show${matchingEvents.length > 1 ? "s" : ""} matching your request: ${titles}. Check them out below!`,
        events: matchingEvents,
      });
    }

    // Fallback: Show top featured available events
    const topEvents = await db
      .select({
        id: events.id,
        title: events.title,
        category: events.category,
        location: events.location,
        ticketPriceCents: events.ticketPriceCents,
        startsAt: events.startsAt,
        ticketsRemaining: events.ticketsRemaining,
        imageUrl: events.imageUrl,
      })
      .from(events)
      .where(sql`${events.ticketsRemaining} > 0`)
      .orderBy(desc(events.createdAt))
      .limit(2);

    return NextResponse.json({
      reply: `I couldn't find an exact match for "${message}", but here are some of our top trending shows on Gatherly right now! You can also ask me about tickets, refunds, seat selection, or hosting events.`,
      events: topEvents,
    });
  } catch (error) {
    console.error("AI Chatbot error:", error);
    return NextResponse.json({ error: "Failed to process chat message" }, { status: 500 });
  }
}
