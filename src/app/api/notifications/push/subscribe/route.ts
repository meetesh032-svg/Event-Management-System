import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys) {
      return NextResponse.json({ error: "Missing subscription details" }, { status: 400 });
    }

    const [subscription] = await db
      .insert(pushSubscriptions)
      .values({
        userId: user.id,
        endpoint,
        keys: typeof keys === "string" ? keys : JSON.stringify(keys),
      })
      .returning();

    return NextResponse.json({ success: true, subscription });
  } catch (error) {
    console.error("Push subscribe error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
