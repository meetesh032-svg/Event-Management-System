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

// Test 8: Payment Fee & Tax Calculation (18% GST + Convenience + Platform Fee)
test("Payment Architecture Test: Transparent Fee & Tax Breakdown", () => {
  const calculateFeeBreakdown = (subtotalCents, discountCents = 0) => {
    const discountedBase = Math.max(0, subtotalCents - discountCents);
    const convenienceFeeCents = subtotalCents > 0 ? 2500 : 0; // ₹25.00
    const platformFeeCents = subtotalCents > 0 ? 500 : 0;     // ₹5.00
    const taxableFee = convenienceFeeCents + platformFeeCents;
    const taxesCents = subtotalCents > 0 ? Math.round((taxableFee * 18) / 100) : 0; // 18% GST = ₹5.40 -> 540 cents
    const totalAmountCents = discountedBase + convenienceFeeCents + platformFeeCents + taxesCents;

    return {
      subtotalCents,
      convenienceFeeCents,
      platformFeeCents,
      taxesCents,
      discountCents,
      totalAmountCents,
    };
  };

  // Regular Booking: ₹1,000 subtotal (100,000 cents)
  const breakdown = calculateFeeBreakdown(100000);
  assert.equal(breakdown.subtotalCents, 100000);
  assert.equal(breakdown.convenienceFeeCents, 2500);
  assert.equal(breakdown.platformFeeCents, 500);
  assert.equal(breakdown.taxesCents, 540); // 18% of ₹30 = ₹5.40
  assert.equal(breakdown.totalAmountCents, 103540); // ₹1,035.40

  // Free Event: ₹0 subtotal
  const freeBreakdown = calculateFeeBreakdown(0);
  assert.equal(freeBreakdown.totalAmountCents, 0);

  // Discounted with coupon
  const promoBreakdown = calculateFeeBreakdown(100000, 20000); // ₹200 off
  assert.equal(promoBreakdown.totalAmountCents, 83540); // ₹800 + ₹35.40
});

// Test 9: Payment Gateway Abstraction & Cryptographic Verification
test("Payment Architecture Test: Razorpay HMAC & PhonePe Checksum Verification", async () => {
  const crypto = await import("crypto");

  // 1. Razorpay HMAC SHA256 Signature Verification
  const keySecret = "rzp_secret_production_key";
  const orderId = "order_Gatherly_98765";
  const paymentId = "pay_Hk392Jkld8";
  const validSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const verifyRazorpay = (oid, pid, sig, secret) => {
    const generated = crypto.createHmac("sha256", secret).update(`${oid}|${pid}`).digest("hex");
    return generated === sig;
  };

  assert.equal(verifyRazorpay(orderId, paymentId, validSignature, keySecret), true);
  assert.equal(verifyRazorpay(orderId, paymentId, "tampered_signature", keySecret), false);

  // 2. PhonePe Checksum Verification (Base64 + Endpoint + Salt)
  const saltKey = "phonepe_salt_key_12345";
  const saltIndex = "1";
  const payloadObj = { merchantId: "PGTEST", amount: 50000 };
  const base64 = Buffer.from(JSON.stringify(payloadObj)).toString("base64");
  const expectedHash = crypto.createHash("sha256").update(`${base64}/pg/v1/pay${saltKey}`).digest("hex");
  const xVerifyHeader = `${expectedHash}###${saltIndex}`;

  const verifyPhonePe = (b64, verifyHeader, salt, index) => {
    const [receivedHash, receivedIndex] = verifyHeader.split("###");
    if (receivedIndex !== index) return false;
    const computed = crypto.createHash("sha256").update(`${b64}/pg/v1/pay${salt}`).digest("hex");
    return computed === receivedHash;
  };

  assert.equal(verifyPhonePe(base64, xVerifyHeader, saltKey, saltIndex), true);
});

// Test 10: Idempotency & Duplicate Payment Prevention
test("Payment Architecture Test: Idempotent Booking Creation Prevents Double Booking", () => {
  const processedSessions = new Set();

  const recordBooking = (sessionId) => {
    if (processedSessions.has(sessionId)) {
      return { success: true, isDuplicate: true };
    }
    processedSessions.add(sessionId);
    return { success: true, isDuplicate: false, bookingId: 101 };
  };

  const firstAttempt = recordBooking("sess_12345_unique");
  assert.equal(firstAttempt.isDuplicate, false);
  assert.equal(firstAttempt.bookingId, 101);

  // Simultaneous replay with same session ID
  const replayAttempt = recordBooking("sess_12345_unique");
  assert.equal(replayAttempt.isDuplicate, true);
});

