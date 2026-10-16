import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, waitlist, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { and, eq, or, sql } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const eventId = Number(id);

    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const user = await getCurrentUser();
    const body = await req.json().catch(() => ({}));
    const { guestEmail, guestName, quantity = 1 } = body;

    const email = user?.email || guestEmail;
    const name = user?.name || guestName || "Guest Attendee";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please provide a valid email address to join the waiting list" },
        { status: 400 }
      );
    }

    // Check if already on waitlist for this event
    const existing = await db.query.waitlist.findFirst({
      where: and(
        eq(waitlist.eventId, eventId),
        or(
          user ? eq(waitlist.userId, user.id) : sql`FALSE`,
          eq(waitlist.guestEmail, email.toLowerCase().trim())
        ),
        eq(waitlist.status, "waiting")
      ),
    });

    if (existing) {
      return NextResponse.json({
        message: "You are already on the waiting list for this event!",
        alreadyWaiting: true,
      });
    }

    const [entry] = await db
      .insert(waitlist)
      .values({
        eventId,
        userId: user ? user.id : null,
        guestEmail: email.toLowerCase().trim(),
        guestName: name,
        quantity: Math.max(1, Number(quantity) || 1),
        status: "waiting",
      })
      .returning();

    // Count how many are waiting before this entry
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(waitlist)
      .where(and(eq(waitlist.eventId, eventId), eq(waitlist.status, "waiting")));

    const position = countResult[0]?.count || 1;

    return NextResponse.json({
      success: true,
      message: `You've been added to the waiting list! Your current position is #${position}. We'll notify you via email the moment tickets become available.`,
      position,
      waitlistId: entry.id,
    });
  } catch (error) {
    console.error("Waitlist error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
    if (!user) {
      return NextResponse.json({ onWaitlist: false });
    }

    const entry = await db.query.waitlist.findFirst({
      where: and(
        eq(waitlist.eventId, eventId),
        eq(waitlist.userId, user.id),
        eq(waitlist.status, "waiting")
      ),
    });

    return NextResponse.json({
      onWaitlist: Boolean(entry),
      status: entry?.status || null,
    });
  } catch (error) {
    console.error("Get waitlist status error:", error);
    return NextResponse.json({ onWaitlist: false });
  }
}
