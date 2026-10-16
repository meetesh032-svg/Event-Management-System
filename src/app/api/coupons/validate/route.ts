import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

// Ensure default promo coupons are seeded into database if table is empty
async function ensureDefaultCoupons() {
  const existing = await db.query.coupons.findFirst();
  if (!existing) {
    await db.insert(coupons).values([
      {
        code: "WELCOME20",
        description: "20% OFF on all bookings up to ₹500",
        discountType: "percentage",
        discountValue: 20,
        minOrderCents: 10000, // min ₹100
        maxDiscountCents: 50000, // max ₹500
        isActive: true,
      },
      {
        code: "GATHER50",
        description: "Flat ₹50 OFF on orders above ₹200",
        discountType: "fixed",
        discountValue: 5000, // ₹50
        minOrderCents: 20000, // min ₹200
        isActive: true,
      },
      {
        code: "GROUP10",
        description: "10% OFF for Group Bookings (4+ tickets)",
        discountType: "percentage",
        discountValue: 10,
        minOrderCents: 40000, // min ₹400
        isActive: true,
      },
    ]);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDefaultCoupons();

    const body = await req.json();
    const { code, orderTotalCents = 0, eventId, quantity = 1 } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();

    const coupon = await db.query.coupons.findFirst({
      where: and(
        eq(coupons.code, normalizedCode),
        eq(coupons.isActive, true)
      ),
    });

    if (!coupon) {
      return NextResponse.json({ error: "Invalid or inactive promo code" }, { status: 404 });
    }

    const now = new Date();
    if (coupon.validUntil && coupon.validUntil < now) {
      return NextResponse.json({ error: "Promo code has expired" }, { status: 400 });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({ error: "Promo code usage limit reached" }, { status: 400 });
    }

    if (coupon.eventId && eventId && coupon.eventId !== Number(eventId)) {
      return NextResponse.json({ error: "This promo code is not valid for this event" }, { status: 400 });
    }

    const totalCents = Number(orderTotalCents);
    if (totalCents < coupon.minOrderCents) {
      const minRupees = (coupon.minOrderCents / 100).toLocaleString("en-IN");
      return NextResponse.json(
        { error: `Minimum order amount of ₹${minRupees} required to use this coupon` },
        { status: 400 }
      );
    }

    // Special check for group code
    if (normalizedCode === "GROUP10" && Number(quantity) < 4) {
      return NextResponse.json(
        { error: "GROUP10 requires a group booking of at least 4 tickets" },
        { status: 400 }
      );
    }

    // Calculate discount
    let discountCents = 0;
    if (coupon.discountType === "percentage") {
      discountCents = Math.round((totalCents * coupon.discountValue) / 100);
      if (coupon.maxDiscountCents && discountCents > coupon.maxDiscountCents) {
        discountCents = coupon.maxDiscountCents;
      }
    } else {
      discountCents = coupon.discountValue;
    }

    discountCents = Math.min(discountCents, totalCents);
    const finalTotalCents = Math.max(0, totalCents - discountCents);

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountCents,
      finalTotalCents,
      originalTotalCents: totalCents,
    });
  } catch (error) {
    console.error("Coupon validation error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
