/**
 * Utility functions for formatting prices in Indian Rupees (₹).
 * Prices are stored in paise (1 Rupee = 100 paise).
 */

export function formatPrice(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || cents === 0) {
    return "Free";
  }
  const rupees = cents / 100;
  const hasDecimals = rupees % 1 !== 0;

  return `₹${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatRupees(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || cents === 0) {
    return "₹0";
  }
  const rupees = cents / 100;
  const hasDecimals = rupees % 1 !== 0;

  return `₹${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}
