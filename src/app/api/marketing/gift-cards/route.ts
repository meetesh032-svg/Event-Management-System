import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MarketingService } from "@/lib/marketing-service";
import { db } from "@/db";
import { giftCards, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, code } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Gift card code is required" }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    if (action === "verify") {
      const verification = await MarketingService.verifyGiftCard(cleanCode);
      return NextResponse.json(verification);
    }

    if (action === "redeem") {
      const verification = await MarketingService.verifyGiftCard(cleanCode);
      if (!verification.valid) {
        return NextResponse.json({ error: verification.error || "Invalid gift card" }, { status: 400 });
      }

      const balanceToAdd = verification.balanceCents;

      // Atomic claim: update card balance to 0 and credit user wallet
      await db
        .update(giftCards)
        .set({
          currentBalanceCents: 0,
          isClaimed: true,
        })
        .where(eq(giftCards.code, cleanCode));

      await db
        .update(users)
        .set({
          walletBalanceCents: sql`COALESCE(${users.walletBalanceCents}, 0) + ${balanceToAdd}`,
        })
        .where(eq(users.id, user.id));

      return NextResponse.json({
        success: true,
        message: `Successfully redeemed ₹${(balanceToAdd / 100).toFixed(2)} to your Gatherly Wallet!`,
        creditedCents: balanceToAdd,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Gift card processing error:", error);
    return NextResponse.json({ error: "Failed to process gift card" }, { status: 500 });
  }
}
