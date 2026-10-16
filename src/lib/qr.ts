import QRCode from "qrcode";

export async function generateQRCodeBuffer(data: string): Promise<Buffer> {
  return QRCode.toBuffer(data, {
    errorCorrectionLevel: "H",
    type: "png",
    width: 300,
    margin: 2,
  });
}

export async function generateQRCodeDataURL(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: "H",
    width: 300,
    margin: 2,
  });
}

