import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { venues, seatLayouts, events } from "@/db/schema";
import { requireOrganizer } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const venueId = parseInt(id, 10);

    if (isNaN(venueId)) {
      return NextResponse.json({ error: "Invalid venue ID" }, { status: 400 });
    }

    const venue = await db.query.venues.findFirst({
      where: eq(venues.id, venueId),
    });

    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    let parsedAmenities: string[] = [];
    if (venue.amenities) {
      try {
        parsedAmenities = JSON.parse(venue.amenities);
      } catch {
        parsedAmenities = venue.amenities.split(",").map((s) => s.trim());
      }
    }

    // Fetch seat layouts
    const layouts = await db.query.seatLayouts.findMany({
      where: eq(seatLayouts.venueId, venueId),
    });

    const parsedLayouts = layouts.map((l) => ({
      ...l,
      vipRows: l.vipRows ? JSON.parse(l.vipRows) : ["A", "B"],
      accessibleSeats: l.accessibleSeats ? JSON.parse(l.accessibleSeats) : [],
      categories: l.categories ? JSON.parse(l.categories) : [],
    }));

    // Fetch upcoming events at this venue
    const venueEvents = await db.query.events.findMany({
      where: eq(events.venueId, venueId),
      orderBy: [desc(events.startsAt)],
      limit: 6,
    });

    return NextResponse.json({
      venue: {
        ...venue,
        amenities: parsedAmenities,
      },
      layouts: parsedLayouts,
      events: venueEvents,
    });
  } catch (error) {
    console.error("Venue detail error:", error);
    return NextResponse.json({ error: "Failed to fetch venue" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireOrganizer();
    const { id } = await params;
    const venueId = parseInt(id, 10);

    if (isNaN(venueId)) {
      return NextResponse.json({ error: "Invalid venue ID" }, { status: 400 });
    }

    const body = await req.json();
    const {
      name,
      description,
      address,
      city,
      state,
      capacity,
      imageUrl,
      mapCoordinates,
      amenities,
    } = body;

    const [updatedVenue] = await db
      .update(venues)
      .set({
        name,
        description,
        address,
        city,
        state,
        capacity: Number(capacity) || 500,
        imageUrl,
        mapCoordinates,
        amenities: Array.isArray(amenities) ? JSON.stringify(amenities) : amenities,
      })
      .where(
        user.role === "admin"
          ? eq(venues.id, venueId)
          : and(eq(venues.id, venueId), eq(venues.organizerId, user.id))
      )
      .returning();

    if (!updatedVenue) {
      return NextResponse.json({ error: "Venue not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, venue: updatedVenue });
  } catch (error) {
    console.error("Update venue error:", error);
    return NextResponse.json({ error: "Unauthorized or update failed" }, { status: 401 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireOrganizer();
    const { id } = await params;
    const venueId = parseInt(id, 10);

    if (isNaN(venueId)) {
      return NextResponse.json({ error: "Invalid venue ID" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(venues)
      .where(
        user.role === "admin"
          ? eq(venues.id, venueId)
          : and(eq(venues.id, venueId), eq(venues.organizerId, user.id))
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Venue not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Venue deleted successfully" });
  } catch (error) {
    console.error("Delete venue error:", error);
    return NextResponse.json({ error: "Unauthorized or delete failed" }, { status: 401 });
  }
}
