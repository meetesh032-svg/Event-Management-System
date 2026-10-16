import { NextRequest, NextResponse } from "next/server";
import { releaseSeats } from "@/lib/seat-service";
import { requireAuth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const eventId = Number(id);

    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    const body = await req.json();
    const { seatNumbers } = body;

    if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      return NextResponse.json(
        { error: "seatNumbers must be a non-empty array" },
        { status: 400 }
      );
    }

    const result = await releaseSeats(eventId, seatNumbers, user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Release seats error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
