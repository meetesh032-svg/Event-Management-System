import { NextRequest, NextResponse } from "next/server";
import { getUserSeatHistory } from "@/lib/seat-service";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const history = await getUserSeatHistory(user.id);
    return NextResponse.json({ history });
  } catch (error) {
    console.error("Get seat history error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
