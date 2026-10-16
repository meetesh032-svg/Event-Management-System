import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { seatLayouts, venues } from "@/db/schema";
import { requireOrganizer } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const venueId = parseInt(id, 10);

    const layouts = await db.query.seatLayouts.findMany({
      where: eq(seatLayouts.venueId, venueId),
    });

    return NextResponse.json({
      layouts: layouts.map((l) => ({
        ...l,
        vipRows: l.vipRows ? JSON.parse(l.vipRows) : [],
        accessibleSeats: l.accessibleSeats ? JSON.parse(l.accessibleSeats) : [],
        categories: l.categories ? JSON.parse(l.categories) : [],
      })),
    });
  } catch (error) {
    console.error("Get layouts error:", error);
    return NextResponse.json({ error: "Failed to fetch layouts" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireOrganizer();
    const { id } = await params;
    const venueId = parseInt(id, 10);

    const body = await req.json();
    const { name, rows, cols, vipRows, accessibleSeats, categories } = body;

    if (!name || !rows || !cols) {
      return NextResponse.json(
        { error: "Layout name, rows, and columns are required" },
        { status: 400 }
      );
    }

    const [layout] = await db
      .insert(seatLayouts)
      .values({
        venueId,
        name,
        rows: Number(rows) || 10,
        cols: Number(cols) || 12,
        vipRows: Array.isArray(vipRows) ? JSON.stringify(vipRows) : JSON.stringify(["A", "B"]),
        accessibleSeats: Array.isArray(accessibleSeats) ? JSON.stringify(accessibleSeats) : JSON.stringify([]),
        categories: Array.isArray(categories) ? JSON.stringify(categories) : JSON.stringify([
          { name: "VIP", multiplier: 2.0, color: "#F59E0B" },
          { name: "Premium", multiplier: 1.4, color: "#8B5CF6" },
          { name: "Standard", multiplier: 1.0, color: "#3B82F6" },
        ]),
      })
      .returning();

    return NextResponse.json({ success: true, layout });
  } catch (error) {
    console.error("Create layout error:", error);
    return NextResponse.json({ error: "Unauthorized or failed to create layout" }, { status: 401 });
  }
}
