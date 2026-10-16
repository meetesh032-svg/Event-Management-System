import { NextRequest, NextResponse } from "next/server";
import { calculateEmiPlans } from "@/lib/payment-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const amountStr = searchParams.get("amount");
    const amountCents = amountStr ? parseInt(amountStr, 10) : 0;

    if (amountCents < 100000) {
      // EMI usually for ₹1,000+
      return NextResponse.json({
        eligible: false,
        message: "EMI is available on orders of ₹1,000 or above",
        plans: [],
      });
    }

    const plans = calculateEmiPlans(amountCents);
    return NextResponse.json({ eligible: true, plans });
  } catch (error) {
    console.error("EMI plans error:", error);
    return NextResponse.json({ error: "Failed to calculate EMI" }, { status: 500 });
  }
}
