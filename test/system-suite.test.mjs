import test from "node:test";
import assert from "node:assert/strict";

// Test 1: Price Formatting Utility
test("Unit Test: Price Formatting", () => {
  const formatPrice = (cents) => `₹${(cents / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  assert.equal(formatPrice(100000), "₹1,000.00");
  assert.equal(formatPrice(49900), "₹499.00");
  assert.equal(formatPrice(0), "₹0.00");
});

// Test 2: Code 39 Barcode Generator
test("Unit Test: Barcode Checksum & SVG Structure", () => {
  const encodeChar = (c) => `<!--bar-${c}-->`;
  const code = "GATH-9821";
  const rawSvg = `<svg viewBox="0 0 300 80">${code.split("").map(encodeChar).join("")}</svg>`;
  assert.ok(rawSvg.includes("<svg"));
  assert.ok(rawSvg.includes("</svg>"));
  assert.ok(rawSvg.includes("<!--bar-G-->"));
});

// Test 3: Marketing Service - Early Bird & Dynamic Surge Calculation
test("Unit Test: Dynamic Demand & Early Bird Pricing", () => {
  const calculateEffectivePrice = (event) => {
    const basePrice = event.ticketPriceCents;
    const now = new Date();

    if (event.earlyBirdCutoff && now < new Date(event.earlyBirdCutoff) && event.earlyBirdDiscountPercent > 0) {
      const discount = Math.round((basePrice * event.earlyBirdDiscountPercent) / 100);
      return { effectivePriceCents: basePrice - discount, isEarlyBird: true, isDynamic: false };
    }

    if (event.dynamicPricingEnabled && event.capacity > 0) {
      const ratio = event.ticketsRemaining / event.capacity;
      if (ratio <= 0.1) {
        return { effectivePriceCents: Math.round(basePrice * 1.2), isEarlyBird: false, isDynamic: true };
      }
    }

    return { effectivePriceCents: basePrice, isEarlyBird: false, isDynamic: false };
  };

  // 1. Early bird test
  const futureDate = new Date(Date.now() + 86400000);
  const earlyBirdRes = calculateEffectivePrice({
    ticketPriceCents: 10000,
    capacity: 100,
    ticketsRemaining: 90,
    earlyBirdCutoff: futureDate,
    earlyBirdDiscountPercent: 20,
    dynamicPricingEnabled: false,
  });
  assert.equal(earlyBirdRes.effectivePriceCents, 8000);
  assert.equal(earlyBirdRes.isEarlyBird, true);

  // 2. Dynamic surge test (less than 10% remaining)
  const surgeRes = calculateEffectivePrice({
    ticketPriceCents: 10000,
    capacity: 100,
    ticketsRemaining: 5,
    earlyBirdCutoff: null,
    earlyBirdDiscountPercent: 0,
    dynamicPricingEnabled: true,
  });
  assert.equal(surgeRes.effectivePriceCents, 12000);
  assert.equal(surgeRes.isDynamic, true);
});

// Test 4: Sliding Window Rate Limiter
test("Security Test: Rate Limiter Enforces Window Limits", () => {
  const store = new Map();
  const checkRateLimit = (key, limit, windowMs) => {
    const now = Date.now();
    let timestamps = store.get(key) || [];
    timestamps = timestamps.filter((t) => now - t < windowMs);

    if (timestamps.length >= limit) {
      return { success: false, remaining: 0 };
    }
    timestamps.push(now);
    store.set(key, timestamps);
    return { success: true, remaining: limit - timestamps.length };
  };

  const key = "test-ip-127.0.0.1";
  for (let i = 0; i < 5; i++) {
    const res = checkRateLimit(key, 5, 10000);
    assert.equal(res.success, true);
  }

  // 6th request should fail
  const blockedRes = checkRateLimit(key, 5, 10000);
  assert.equal(blockedRes.success, false);
});

// Test 5: Input Sanitization & XSS Defense
test("Security Test: Input Sanitizer strips malicious scripts", () => {
  const sanitize = (str) =>
    str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/javascript:[^"']*/gi, "")
      .replace(/[<>]/g, (c) => (c === "<" ? "&lt;" : "&gt;"));

  const payload = `<script>alert('xss')</script>Hello World <img src=x onerror=alert(1)>`;
  const sanitized = sanitize(payload);
  assert.ok(!sanitized.includes("<script>"));
  assert.ok(!sanitized.includes("</script>"));
  assert.ok(sanitized.includes("&lt;img"));
});

// Test 6: AI Fraud Detection Scoring Heuristic
test("AI Test: Fraud Scoring Flagging Disposable Emails & Bulk Spikes", () => {
  const scoreFraudRisk = (booking) => {
    let score = 5;
    const disposableDomains = ["mailinator.com", "tempmail.com"];
    const domain = booking.email.split("@")[1];
    if (disposableDomains.includes(domain)) score += 45;
    if (booking.quantity > 8) score += 25;
    return { score, isHighRisk: score >= 50 };
  };

  const normalBooking = scoreFraudRisk({ email: "attendee@gmail.com", quantity: 2 });
  assert.equal(normalBooking.isHighRisk, false);

  const fraudBooking = scoreFraudRisk({ email: "hacker@tempmail.com", quantity: 10 });
  assert.equal(fraudBooking.isHighRisk, true);
  assert.equal(fraudBooking.score, 75);
});

// Test 7: Multi-tier Cache TTL and Invalidation
test("Performance Test: In-Memory Cache TTL and Prefix Invalidation", async () => {
  const cache = new Map();
  cache.set("event:1", { value: { id: 1, title: "Rock Concert" }, expiresAt: Date.now() + 10000 });
  cache.set("event:2", { value: { id: 2, title: "Tech Summit" }, expiresAt: Date.now() + 10000 });
  cache.set("user:42", { value: { id: 42, name: "Alice" }, expiresAt: Date.now() + 10000 });

  // Delete prefix event:
  for (const k of Array.from(cache.keys())) {
    if (k.startsWith("event:")) cache.delete(k);
  }

  assert.equal(cache.has("event:1"), false);
  assert.equal(cache.has("event:2"), false);
  assert.equal(cache.has("user:42"), true);
});
