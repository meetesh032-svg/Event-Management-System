/**
 * Input Sanitization and XSS Mitigation Utility
 */

export function sanitizeText(input: unknown): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "") // Remove iframes
    .replace(/javascript:[^"']*/gi, "") // Remove javascript pseudo-protocol
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "") // Remove inline event handlers (onload, onerror, etc.)
    .replace(/[<>]/g, (char) => (char === "<" ? "&lt;" : "&gt;")) // Encode angle brackets
    .trim();
}

export function sanitizeEmail(email: unknown): string {
  if (typeof email !== "string") return "";
  return email.trim().toLowerCase().replace(/[^\w.@+-]/g, "");
}

export function sanitizeAlphanumeric(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.replace(/[^a-zA-Z0-9_-]/g, "").trim();
}
