import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateTotpSecret, generateTotpUri, generateBackupCodes } from "@/lib/totp";
import QRCode from "qrcode";

export async function POST() {
  try {
    const user = await requireAuth();

    const secret = generateTotpSecret();
    const uri = generateTotpUri(user.email, secret, "Gatherly");
    const qrCodeDataUrl = await QRCode.toDataURL(uri, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 256,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
    });

    const backupCodes = generateBackupCodes(8);

    return NextResponse.json({
      secret,
      uri,
      qrCodeDataUrl,
      backupCodes,
    });
  } catch (error) {
    console.error("MFA setup error:", error);
    return NextResponse.json({ error: "Unauthorized or failed setup" }, { status: 401 });
  }
}
