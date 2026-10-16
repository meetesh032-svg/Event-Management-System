import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MarketingService } from "@/lib/marketing-service";
import { db } from "@/db";
import { loyaltyPoints, memberships } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { totalPoints, monetaryValueCents } = await MarketingService.getLoyaltyBalance(user.id);

    const history = await db
      .select({
        id: loyaltyPoints.id,
        points: loyaltyPoints.points,
        reason: loyaltyPoints.reason,
        createdAt: loyaltyPoints.createdAt,
      })
      .from(loyaltyPoints)
      .where(eq(loyaltyPoints.userId, user.id))
      .orderBy(desc(loyaltyPoints.createdAt))
      .limit(10);

    const [membership] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, user.id))
      .limit(1);

    return NextResponse.json({
      totalPoints,
      monetaryValueCents,
      membershipTier: membership ? membership.tier : "Bronze Club Member",
      membershipDiscount: membership ? membership.discountPercent : 0,
      membershipValidUntil: membership ? membership.validUntil : null,
      history,
    });
  } catch (error) {
    console.error("Loyalty points error:", error);
    return NextResponse.json({ error: "Failed to fetch loyalty status" }, { status: 500 });
  }
}
