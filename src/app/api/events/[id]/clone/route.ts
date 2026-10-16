import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireOrganizer } from "@/lib/auth";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireOrganizer();
    const { id } = await params;
    const eventId = Number(id);

    if (Number.isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const sourceEvent = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.organizerId, user.id)),
    });

    if (!sourceEvent) {
      return NextResponse.json({ error: "Source event not found or unauthorized" }, { status: 404 });
    }

    // Offset dates by 7 days for the cloned event
    const newStartsAt = new Date(sourceEvent.startsAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const newEndsAt = new Date(sourceEvent.endsAt.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [cloned] = await db
      .insert(events)
      .values({
        title: `${sourceEvent.title} (Copy)`,
        description: sourceEvent.description,
        category: sourceEvent.category,
        location: sourceEvent.location,
        startsAt: newStartsAt,
        endsAt: newEndsAt,
        ticketPriceCents: sourceEvent.ticketPriceCents,
        capacity: sourceEvent.capacity,
        ticketsRemaining: sourceEvent.capacity,
        imageUrl: sourceEvent.imageUrl,
        organizerId: user.id,
        status: "draft",
        venueId: sourceEvent.venueId,
        seatLayoutId: sourceEvent.seatLayoutId,
      })
      .returning();

    return NextResponse.json({ success: true, event: cloned }, { status: 201 });
  } catch (error) {
    console.error("Clone event error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
