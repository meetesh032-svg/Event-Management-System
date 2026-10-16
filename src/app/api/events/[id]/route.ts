import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireOrganizer } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const eventId = Number(id);
    if (Number.isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const [row] = await db
      .select({
        event: events,
        organizerName: users.name,
        isVerifiedOrganizer: users.isVerifiedOrganizer,
        organizerAvatar: users.avatarUrl,
      })
      .from(events)
      .leftJoin(users, eq(events.organizerId, users.id))
      .where(eq(events.id, eventId))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({
      event: {
        ...row.event,
        organizerName: row.organizerName,
        isVerifiedOrganizer: row.isVerifiedOrganizer,
        organizerAvatar: row.organizerAvatar,
      },
    });
  } catch (error) {
    console.error("Get event error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireOrganizer();
    const { id } = await params;
    const eventId = Number(id);
    if (Number.isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const body = await req.json();
    const updateData: Record<string, any> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.startsAt !== undefined) updateData.startsAt = new Date(body.startsAt);
    if (body.endsAt !== undefined) updateData.endsAt = new Date(body.endsAt);
    if (body.ticketPriceCents !== undefined) updateData.ticketPriceCents = Number(body.ticketPriceCents);
    if (body.capacity !== undefined) updateData.capacity = Number(body.capacity);
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.scheduledPublishAt !== undefined) {
      updateData.scheduledPublishAt = body.scheduledPublishAt ? new Date(body.scheduledPublishAt) : null;
    }
    if (body.venueId !== undefined) updateData.venueId = body.venueId ? Number(body.venueId) : null;
    if (body.seatLayoutId !== undefined) updateData.seatLayoutId = body.seatLayoutId ? Number(body.seatLayoutId) : null;

    const [updatedEvent] = await db
      .update(events)
      .set(updateData)
      .where(and(eq(events.id, eventId), eq(events.organizerId, user.id)))
      .returning();

    if (!updatedEvent) {
      return NextResponse.json({ error: "Event not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    console.error("Update event error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireOrganizer();
    const { id } = await params;
    const eventId = Number(id);
    if (Number.isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const [deletedEvent] = await db
      .delete(events)
      .where(and(eq(events.id, eventId), eq(events.organizerId, user.id)))
      .returning();

    if (!deletedEvent) {
      return NextResponse.json({ error: "Event not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete event error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
