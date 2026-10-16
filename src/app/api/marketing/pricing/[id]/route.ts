import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MarketingService } from "@/lib/marketing-service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const eventId = Number(id);
    if (Number.isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const [event] = await db
      .select({
        id: events.id,
        ticketPriceCents: events.ticketPriceCents,
        capacity: events.capacity,
        ticketsRemaining: events.ticketsRemaining,
        earlyBirdCutoff: events.earlyBirdCutoff,
        earlyBirdDiscountPercent: events.earlyBirdDiscountPercent,
        dynamicPricingEnabled: events.dynamicPricingEnabled,
      })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const pricing = MarketingService.calculateEffectivePrice(event);
    return NextResponse.json(pricing);
  } catch (error) {
    console.error("Pricing calculation error:", error);
    return NextResponse.json({ error: "Failed to calculate pricing" }, { status: 500 });
  }
}
