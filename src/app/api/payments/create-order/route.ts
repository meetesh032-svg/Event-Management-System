import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { paymentService } from "@/lib/payments/payment-service";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const authUser = await getCurrentUser();
    const body = await req.json();

    const {
      eventId,
      gatewayId = "razorpay",
      quantity = 1,
      seatNumbers,
      couponCode,
      isGuest,
      guestEmail,
      guestName,
      guestPhone,
    } = body;

    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

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
        { error: "Please log in or provide guest contact details to checkout." },
        { status: 401 }
      );
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || `http://${req.headers.get("host")}`;
    const returnUrl = `${origin}/bookings/success?gateway=${gatewayId}`;
    const cancelUrl = `${origin}/checkout?eventId=${eventId}&cancelled=true`;

    const { orderResult, feeBreakdown, event } = await paymentService.createCheckoutOrder({
      eventId: Number(eventId),
      userId,
      customer: {
        name: customerName,
        email: customerEmail,
        phone: guestPhone || authUser?.phone || undefined,
      },
      quantity: Number(quantity) || 1,
      seatNumbers,
      couponCode,
      gatewayId,
      returnUrl,
      cancelUrl,
      isGuest: isGuestCheckout,
    });

    return NextResponse.json({
      orderResult,
      feeBreakdown,
      userId,
      event: {
        id: event.id,
        title: event.title,
        ticketPriceCents: event.ticketPriceCents,
        imageUrl: event.imageUrl,
        location: event.location,
        startsAt: event.startsAt,
      },
    });
  } catch (error) {
    console.error("Create payment order error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("expired") || message.includes("held") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
