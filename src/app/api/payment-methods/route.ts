import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { savedPaymentMethods } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  try {
    const user = await requireAuth();

    const methods = await db.query.savedPaymentMethods.findMany({
      where: eq(savedPaymentMethods.userId, user.id),
      orderBy: [desc(savedPaymentMethods.isDefault), desc(savedPaymentMethods.createdAt)],
    });

    return NextResponse.json({ paymentMethods: methods });
  } catch (error) {
    console.error("Get payment methods error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { type, cardBrand, last4, expMonth, expYear, upiId, isDefault } = body;

    if (type !== "card" && type !== "upi") {
      return NextResponse.json({ error: "Type must be 'card' or 'upi'" }, { status: 400 });
    }

    if (type === "card" && (!last4 || !cardBrand)) {
      return NextResponse.json({ error: "Card brand and last 4 digits are required" }, { status: 400 });
    }

    if (type === "upi" && !upiId) {
      return NextResponse.json({ error: "UPI ID is required" }, { status: 400 });
    }

    // If marked default, unset any previous defaults for this user
    if (isDefault) {
      await db
        .update(savedPaymentMethods)
        .set({ isDefault: false })
        .where(eq(savedPaymentMethods.userId, user.id));
    }

    const [newMethod] = await db
      .insert(savedPaymentMethods)
      .values({
        userId: user.id,
        type,
        cardBrand: cardBrand || null,
        last4: last4 || null,
        expMonth: expMonth || null,
        expYear: expYear || null,
        upiId: upiId || null,
        isDefault: !!isDefault,
      })
      .returning();

    return NextResponse.json({
      success: true,
      paymentMethod: newMethod,
    });
  } catch (error) {
    console.error("Save payment method error:", error);
    return NextResponse.json({ error: "Unauthorized or save failed" }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { id } = await req.json();

    const methodId = parseInt(id, 10);
    if (isNaN(methodId)) {
      return NextResponse.json({ error: "Invalid payment method ID" }, { status: 400 });
    }

    await db
      .delete(savedPaymentMethods)
      .where(
        and(
          eq(savedPaymentMethods.id, methodId),
          eq(savedPaymentMethods.userId, user.id)
        )
      );

    return NextResponse.json({
      success: true,
      message: "Payment method removed.",
    });
  } catch (error) {
    console.error("Delete payment method error:", error);
    return NextResponse.json({ error: "Unauthorized or delete failed" }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { id } = await req.json();

    const methodId = parseInt(id, 10);
    if (isNaN(methodId)) {
      return NextResponse.json({ error: "Invalid payment method ID" }, { status: 400 });
    }

    // Unset current defaults
    await db
      .update(savedPaymentMethods)
      .set({ isDefault: false })
      .where(eq(savedPaymentMethods.userId, user.id));

    // Set new default
    await db
      .update(savedPaymentMethods)
      .set({ isDefault: true })
      .where(
        and(
          eq(savedPaymentMethods.id, methodId),
          eq(savedPaymentMethods.userId, user.id)
        )
      );

    return NextResponse.json({
      success: true,
      message: "Default payment method updated.",
    });
  } catch (error) {
    console.error("Set default payment method error:", error);
    return NextResponse.json({ error: "Unauthorized or update failed" }, { status: 401 });
  }
}
