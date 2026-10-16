import { db } from "@/db";
import { referrals, loyaltyPoints, giftCards, memberships, users, events } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export class MarketingService {
  /**
   * Computes real-time dynamic & early bird pricing for an event
   */
  static calculateEffectivePrice(event: {
    ticketPriceCents: number;
    capacity: number;
    ticketsRemaining: number;
    earlyBirdCutoff?: Date | null;
    earlyBirdDiscountPercent?: number | null;
    dynamicPricingEnabled?: boolean | null;
  }): {
    basePriceCents: number;
    effectivePriceCents: number;
    isEarlyBirdApplied: boolean;
    earlyBirdDiscountPercent: number;
    isDynamicPricingApplied: boolean;
    surgePercent: number;
    savingsCents: number;
  } {
    const basePrice = event.ticketPriceCents;
    let effectivePrice = basePrice;
    let isEarlyBird = false;
    let earlyBirdPercent = 0;
    let isDynamic = false;
    let surge = 0;

    const now = new Date();

    // 1. Check Early Bird Discount
    if (
      event.earlyBirdCutoff &&
      now < new Date(event.earlyBirdCutoff) &&
      (event.earlyBirdDiscountPercent || 0) > 0
    ) {
      isEarlyBird = true;
      earlyBirdPercent = event.earlyBirdDiscountPercent!;
      const discount = Math.round((basePrice * earlyBirdPercent) / 100);
      effectivePrice = Math.max(0, basePrice - discount);
    }
    // 2. Check Dynamic Demand Pricing (Surge when < 20% tickets remain)
    else if (event.dynamicPricingEnabled && event.capacity > 0) {
      const remainingRatio = event.ticketsRemaining / event.capacity;
      if (remainingRatio <= 0.1) {
        // Less than 10% remaining -> 20% surge
        isDynamic = true;
        surge = 20;
        effectivePrice = Math.round(basePrice * 1.2);
      } else if (remainingRatio <= 0.2) {
        // Less than 20% remaining -> 10% surge
        isDynamic = true;
        surge = 10;
        effectivePrice = Math.round(basePrice * 1.1);
      }
    }

    const savingsCents = Math.max(0, basePrice - effectivePrice);

    return {
      basePriceCents: basePrice,
      effectivePriceCents: effectivePrice,
      isEarlyBirdApplied: isEarlyBird,
      earlyBirdDiscountPercent: earlyBirdPercent,
      isDynamicPricingApplied: isDynamic,
      surgePercent: surge,
      savingsCents,
    };
  }

  /**
   * Generates or retrieves an existing referral code for a user
   */
  static async getOrCreateReferralCode(userId: number): Promise<string> {
    const existing = await db
      .select({ code: referrals.code })
      .from(referrals)
      .where(eq(referrals.referrerId, userId))
      .limit(1);

    if (existing[0]?.code) {
      return existing[0].code;
    }

    // Generate clean 8-character unique referral code
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `GATH-${randomSuffix}`;

    await db.insert(referrals).values({
      referrerId: userId,
      code,
      status: "pending",
      rewardAmountCents: 50000, // ₹500 discount reward
    });

    return code;
  }

  /**
   * Calculates total loyalty points balance for user
   */
  static async getLoyaltyBalance(userId: number): Promise<{ totalPoints: number; monetaryValueCents: number }> {
    const [row] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${loyaltyPoints.points}), 0)`.mapWith(Number),
      })
      .from(loyaltyPoints)
      .where(eq(loyaltyPoints.userId, userId));

    const totalPoints = row?.total || 0;
    // 100 points = ₹10 (1000 cents)
    const monetaryValueCents = totalPoints * 10;

    return { totalPoints, monetaryValueCents };
  }

  /**
   * Award loyalty points for booking (10 points per ₹100 spent)
   */
  static async awardBookingPoints(userId: number, bookingId: number, totalCents: number) {
    const pointsToAward = Math.max(10, Math.floor(totalCents / 1000));
    await db.insert(loyaltyPoints).values({
      userId,
      bookingId,
      points: pointsToAward,
      reason: `Ticket booking purchase reward (+${pointsToAward} pts)`,
    });
  }

  /**
   * Verifies & redeems a gift card
   */
  static async verifyGiftCard(code: string): Promise<{ valid: boolean; balanceCents: number; error?: string }> {
    const [card] = await db
      .select()
      .from(giftCards)
      .where(eq(giftCards.code, code.toUpperCase()))
      .limit(1);

    if (!card) {
      return { valid: false, balanceCents: 0, error: "Invalid gift card code" };
    }

    if (card.currentBalanceCents <= 0) {
      return { valid: false, balanceCents: 0, error: "Gift card balance is zero" };
    }

    if (card.expiresAt && new Date() > new Date(card.expiresAt)) {
      return { valid: false, balanceCents: 0, error: "Gift card has expired" };
    }

    return { valid: true, balanceCents: card.currentBalanceCents };
  }
}
