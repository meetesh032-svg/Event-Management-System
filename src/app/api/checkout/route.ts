import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { eventId } = await req.json();

    if (!eventId) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    const event = await db.query.events.findFirst({
      where: eq(events.id, Number(eventId)),
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.ticketsRemaining < 1) {
      return NextResponse.json({ error: "Sold out" }, { status: 409 });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? `http://${req.headers.get("host")}`;

    const fakeSessionId = `fake_sess_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const fakeCheckoutUrl = `${origin}/checkout/fake?session_id=${fakeSessionId}&eventId=${event.id}&userId=${user.id}&amount=${event.ticketPriceCents}&title=${encodeURIComponent(event.title)}`;

    return NextResponse.json({ url: fakeCheckoutUrl });
  } catch (error) {
    console.error("Checkout error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
