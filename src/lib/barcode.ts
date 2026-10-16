/**
 * Pure TypeScript Code 39 Barcode Generator.
 * Encodes uppercase alphanumeric strings (0-9, A-Z, hyphens, etc.) into clean SVG or DataURL barcodes.
 */

const CODE39_PATTERNS: Record<string, string> = {
  "0": "000110100",
  "1": "100100001",
  "2": "001100001",
  "3": "101100000",
  "4": "000110001",
  "5": "100110000",
  "6": "001110000",
  "7": "000100101",
  "8": "100100100",
  "9": "001100100",
  "A": "100001001",
  "B": "001001001",
  "C": "101001000",
  "D": "000011001",
  "E": "100011000",
  "F": "001011000",
  "G": "000001101",
  "H": "100001100",
  "I": "001001100",
  "J": "000011100",
  "K": "100000011",
  "L": "001000011",
  "M": "101000010",
  "N": "000010011",
  "O": "100010010",
  "P": "001010010",
  "Q": "000000111",
  "R": "100000110",
  "S": "001000110",
  "T": "000010110",
  "U": "110000001",
  "V": "011000001",
  "W": "111000000",
  "X": "010010001",
  "Y": "110010000",
  "Z": "011010000",
  "-": "010000101",
  ".": "110000100",
  " ": "011000100",
  "$": "010101000",
  "/": "010100010",
  "+": "010001010",
  "%": "000101010",
  "*": "010010100", // Start / Stop character
};

export interface BarcodeOptions {
  height?: number;
  narrowBarWidth?: number;
  wideBarWidth?: number;
  quietZone?: number;
  includeText?: boolean;
  barColor?: string;
  bgColor?: string;
}

export function generateCode39Svg(
  input: string,
  options: BarcodeOptions = {}
): string {
  const {
    height = 50,
    narrowBarWidth = 2,
    wideBarWidth = 5,
    quietZone = 15,
    includeText = true,
    barColor = "#0f172a",
    bgColor = "#ffffff",
  } = options;

  // Normalize: prepend/append start/stop '*' and sanitize characters
  const rawText = input.toUpperCase().replace(/[^0-9A-Z\-. $/+%]/g, "-");
  const fullText = `*${rawText}*`;

  let currentX = quietZone;
  const rects: string[] = [];

  for (let i = 0; i < fullText.length; i++) {
    const char = fullText[i];
    const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS["-"];

    for (let p = 0; p < 9; p++) {
      const isBar = p % 2 === 0;
      const isWide = pattern[p] === "1";
      const width = isWide ? wideBarWidth : narrowBarWidth;

      if (isBar) {
        rects.push(
          `<rect x="${currentX}" y="0" width="${width}" height="${height}" fill="${barColor}" />`
        );
      }
      currentX += width;
    }

    // Inter-character narrow space gap
    currentX += narrowBarWidth;
  }

  const totalWidth = currentX + quietZone;
  const totalHeight = includeText ? height + 18 : height;

  const textElement = includeText
    ? `<text x="${totalWidth / 2}" y="${height + 14}" font-family="monospace" font-size="12" font-weight="600" text-anchor="middle" fill="${barColor}">${rawText}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}">
    <rect width="100%" height="100%" fill="${bgColor}" />
    ${rects.join("\n    ")}
    ${textElement}
  </svg>`;
}

export function generateCode39DataUrl(
  input: string,
  options: BarcodeOptions = {}
): string {
  const svg = generateCode39Svg(input, options);
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}
