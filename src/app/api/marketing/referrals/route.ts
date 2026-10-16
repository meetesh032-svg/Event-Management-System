import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MarketingService } from "@/lib/marketing-service";
import { db } from "@/db";
import { referrals, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const referralCode = await MarketingService.getOrCreateReferralCode(user.id);
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const referralLink = `${protocol}://${host}/register?ref=${referralCode}`;

    // Get list of referred users
    const myReferrals = await db
      .select({
        id: referrals.id,
        status: referrals.status,
        rewardAmountCents: referrals.rewardAmountCents,
        createdAt: referrals.createdAt,
        referredUserName: users.name,
      })
      .from(referrals)
      .leftJoin(users, eq(referrals.referredUserId, users.id))
      .where(eq(referrals.referrerId, user.id))
      .orderBy(desc(referrals.createdAt));

    const completedCount = myReferrals.filter((r) => r.status === "completed").length;
    const totalEarnedCents = completedCount * 50000; // ₹500 per completed referral

    return NextResponse.json({
      code: referralCode,
      referralLink,
      referrals: myReferrals,
      completedCount,
      totalEarnedCents,
    });
  } catch (error) {
    console.error("Referral fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch referral details" }, { status: 500 });
  }
}
