import { NextRequest, NextResponse } from "next/server";
import { holdSeats } from "@/lib/seat-service";
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
    const { seatNumbers, durationMinutes } = body;

    if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      return NextResponse.json(
        { error: "seatNumbers must be a non-empty array of seat codes (e.g. ['A-1', 'A-2'])" },
        { status: 400 }
      );
    }

    if (seatNumbers.length > 8) {
      return NextResponse.json(
        { error: "Maximum 8 seats can be held at once" },
        { status: 400 }
      );
    }

    const result = await holdSeats(
      eventId,
      seatNumbers,
      user.id,
      durationMinutes || 10
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Hold seats error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message.includes("no longer available") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
