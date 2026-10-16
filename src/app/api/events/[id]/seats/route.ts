import { NextRequest, NextResponse } from "next/server";
import { getSeatMapForEvent } from "@/lib/seat-service";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const eventId = Number(id);

    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    const user = await getCurrentUser();
    const seatMap = await getSeatMapForEvent(eventId, user?.id);

    return NextResponse.json(seatMap);
  } catch (error) {
    console.error("Get seat map error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
