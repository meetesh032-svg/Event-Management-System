import { NextRequest, NextResponse } from "next/server";
import { paymentRegistry } from "@/lib/payments/registry";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const amountCents = parseInt(searchParams.get("amount") || "0", 10);
    const currency = searchParams.get("currency") || "INR";

    const gateways = paymentRegistry.getActiveGatewayInfos(amountCents, currency);
    const user = await getCurrentUser();

    return NextResponse.json({
      gateways,
      userWalletBalanceCents: user?.walletBalanceCents || 0,
      convenienceFeeCents: amountCents > 0 ? 2500 : 0,
      platformFeeCents: amountCents > 0 ? 500 : 0,
      taxPercent: 18,
    });
  } catch (error) {
    console.error("Fetch payment methods error:", error);
    return NextResponse.json({ error: "Failed to load payment methods" }, { status: 500 });
  }
}
