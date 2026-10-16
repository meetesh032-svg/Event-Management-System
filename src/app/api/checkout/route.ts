import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { events, seatReservations, users, coupons } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const authUser = await getCurrentUser();
    const body = await req.json();
    const {
      eventId,
      seatNumbers,
      quantity: reqQuantity,
      couponCode,
      isGuest,
      guestEmail,
      guestName,
    } = body;

    if (!eventId) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    // Determine user: authenticated user OR guest account
    let userId: number;
    let customerName = "Attendee";
    let customerEmail = "";
    let isGuestCheckout = false;

    if (authUser) {
      userId = authUser.id;
      customerName = authUser.name;
      customerEmail = authUser.email;
    } else if (guestEmail && guestEmail.includes("@")) {
      isGuestCheckout = true;
      customerEmail = guestEmail.trim().toLowerCase();
      customerName = guestName?.trim() || "Guest Attendee";

      // Look up or auto-provision guest user
      let existingUser = await db.query.users.findFirst({
        where: eq(users.email, customerEmail),
      });

      if (!existingUser) {
        const [newUser] = await db
          .insert(users)
          .values({
            name: customerName,
            email: customerEmail,
            passwordHash: "GUEST_UNREGISTERED",
            role: "attendee",
            isEmailVerified: true,
          })
          .returning();
        existingUser = newUser;
      }
      userId = existingUser.id;
    } else {
      return NextResponse.json(
        { error: "Please log in or provide your email address to checkout" },
        { status: 401 }
      );
    }

    const event = await db.query.events.findFirst({
      where: eq(events.id, Number(eventId)),
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.ticketsRemaining < 1) {
      return NextResponse.json({ error: "Sold out" }, { status: 409 });
    }

    let quantity = Math.max(1, Number(reqQuantity) || 1);
    let totalCents = event.ticketPriceCents * quantity;
    let validatedSeats: string[] = [];

    // If specific seats were selected
    if (Array.isArray(seatNumbers) && seatNumbers.length > 0) {
      validatedSeats = seatNumbers.map((s: string) => s.trim().toUpperCase());
      quantity = validatedSeats.length;

      if (event.ticketsRemaining < quantity) {
        return NextResponse.json({ error: "Not enough tickets remaining" }, { status: 409 });
      }

      // Verify user holds these seats and they haven't expired
      const now = new Date();
      const userHolds = await db.query.seatReservations.findMany({
        where: and(
          eq(seatReservations.eventId, event.id),
          eq(seatReservations.userId, userId),
          eq(seatReservations.status, "held"),
          sql`${seatReservations.heldUntil} > ${now}`,
          inArray(seatReservations.seatNumber, validatedSeats)
        ),
      });

      if (userHolds.length !== validatedSeats.length) {
        return NextResponse.json(
          { error: "One or more selected seats have expired or are no longer held. Please reselect." },
          { status: 409 }
        );
      }

      // Calculate sum of reserved seat prices based on tier
      totalCents = userHolds.reduce((acc, h) => acc + h.priceCents, 0);
    } else {
      if (event.ticketsRemaining < quantity) {
        return NextResponse.json(
          { error: `Only ${event.ticketsRemaining} ticket(s) remaining` },
          { status: 409 }
        );
      }
    }

    // Promo Code & Coupon validation
    let discountCents = 0;
    let appliedCoupon: string | null = null;

    if (couponCode) {
      const codeClean = couponCode.trim().toUpperCase();
      const coupon = await db.query.coupons.findFirst({
        where: and(eq(coupons.code, codeClean), eq(coupons.isActive, true)),
      });

      if (coupon && totalCents >= coupon.minOrderCents) {
        if (coupon.discountType === "percentage") {
          discountCents = Math.round((totalCents * coupon.discountValue) / 100);
          if (coupon.maxDiscountCents && discountCents > coupon.maxDiscountCents) {
            discountCents = coupon.maxDiscountCents;
          }
        } else {
          discountCents = coupon.discountValue;
        }
        discountCents = Math.min(discountCents, totalCents);
        appliedCoupon = coupon.code;
      }
    }

    const finalAmountCents = Math.max(0, totalCents - discountCents);

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? `http://${req.headers.get("host")}`;
    const fakeSessionId = `fake_sess_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const seatsParam = validatedSeats.length ? `&seats=${encodeURIComponent(JSON.stringify(validatedSeats))}` : "";
    const couponParam = appliedCoupon ? `&coupon=${encodeURIComponent(appliedCoupon)}&discount=${discountCents}` : "";
    const guestParam = isGuestCheckout ? `&is_guest=true&guest_email=${encodeURIComponent(customerEmail)}&guest_name=${encodeURIComponent(customerName)}` : "";

    const fakeCheckoutUrl = `${origin}/checkout/fake?session_id=${fakeSessionId}&eventId=${event.id}&userId=${userId}&amount=${finalAmountCents}&original_amount=${totalCents}&quantity=${quantity}&title=${encodeURIComponent(event.title)}${seatsParam}${couponParam}${guestParam}`;

    return NextResponse.json({
      url: fakeCheckoutUrl,
      discountCents,
      finalAmountCents,
      quantity,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("log in") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}


