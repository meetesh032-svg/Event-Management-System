import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { venues, seatLayouts, events } from "@/db/schema";
import { requireOrganizer } from "@/lib/auth";
import { and, eq, ilike, desc, count } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const city = searchParams.get("city") ?? "";

    const conditions = [];
    if (search) {
      conditions.push(ilike(venues.name, `%${search}%`));
    }
    if (city && city.toLowerCase() !== "all") {
      conditions.push(ilike(venues.city, `%${city}%`));
    }

    const rows = await db.query.venues.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: [desc(venues.createdAt)],
    });

    const parsedVenues = rows.map((v) => {
      let parsedAmenities: string[] = [];
      if (v.amenities) {
        try {
          parsedAmenities = JSON.parse(v.amenities);
        } catch {
          parsedAmenities = v.amenities.split(",").map((s) => s.trim());
        }
      }
      return {
        ...v,
        amenities: parsedAmenities,
      };
    });

    return NextResponse.json({ venues: parsedVenues });
  } catch (error) {
    console.error("List venues error:", error);
    return NextResponse.json({ error: "Failed to fetch venues" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganizer();
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

    if (!name || !address || !city || !capacity) {
      return NextResponse.json(
        { error: "Name, address, city, and capacity are required" },
        { status: 400 }
      );
    }

    const [venue] = await db
      .insert(venues)
      .values({
        name,
        description,
        address,
        city,
        state,
        capacity: Number(capacity) || 500,
        imageUrl: imageUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80",
        mapCoordinates,
        amenities: Array.isArray(amenities) ? JSON.stringify(amenities) : amenities,
        organizerId: user.id,
      })
      .returning();

    // Create default seat layout for this venue
    const [layout] = await db
      .insert(seatLayouts)
      .values({
        venueId: venue.id,
        name: "Standard Hall Seating",
        rows: 10,
        cols: 12,
        vipRows: JSON.stringify(["A", "B"]),
        accessibleSeats: JSON.stringify(["J-1", "J-2", "J-11", "J-12"]),
        categories: JSON.stringify([
          { name: "VIP", multiplier: 2.0, color: "#F59E0B" },
          { name: "Premium", multiplier: 1.4, color: "#8B5CF6" },
          { name: "Standard", multiplier: 1.0, color: "#3B82F6" },
        ]),
      })
      .returning();

    return NextResponse.json({
      success: true,
      venue,
      layout,
    });
  } catch (error) {
    console.error("Create venue error:", error);
    return NextResponse.json({ error: "Unauthorized or failed to create venue" }, { status: 401 });
  }
}
