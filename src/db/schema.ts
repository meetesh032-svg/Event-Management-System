import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  pgEnum,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["attendee", "organizer", "admin"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default("attendee"),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  isEmailVerified: boolean("is_email_verified").default(false).notNull(),
  emailVerificationToken: varchar("email_verification_token", { length: 255 }),
  passwordResetToken: varchar("password_reset_token", { length: 255 }),
  passwordResetExpires: timestamp("password_reset_expires", { mode: "date" }),
  mfaSecret: varchar("mfa_secret", { length: 255 }),
  mfaEnabled: boolean("mfa_enabled").default(false).notNull(),
  mfaBackupCodes: text("mfa_backup_codes"),
  bio: text("bio"),
  phone: varchar("phone", { length: 50 }),
  isVerifiedOrganizer: boolean("is_verified_organizer").default(false).notNull(),
  socialLinks: text("social_links"),
  walletBalanceCents: integer("wallet_balance_cents").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  revoked: boolean("revoked").default(false).notNull(),
  userAgent: varchar("user_agent", { length: 500 }),
  ipAddress: varchar("ip_address", { length: 100 }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
  deviceInfo: varchar("device_info", { length: 500 }),
  ipAddress: varchar("ip_address", { length: 100 }),
  lastActive: timestamp("last_active", { mode: "date" }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const venues = pgTable("venues", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  address: varchar("address", { length: 255 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }),
  capacity: integer("capacity").notNull(),
  imageUrl: varchar("image_url", { length: 500 }),
  mapCoordinates: varchar("map_coordinates", { length: 100 }),
  amenities: text("amenities"),
  organizerId: integer("organizer_id").references(() => users.id, { onDelete: "set null" }),
  isApproved: boolean("is_approved").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const seatLayouts = pgTable("seat_layouts", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id").references(() => venues.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  rows: integer("rows").notNull().default(10),
  cols: integer("cols").notNull().default(12),
  vipRows: text("vip_rows"),
  accessibleSeats: text("accessible_seats"),
  categories: text("categories"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  startsAt: timestamp("starts_at", { mode: "date" }).notNull(),
  endsAt: timestamp("ends_at", { mode: "date" }).notNull(),
  ticketPriceCents: integer("ticket_price_cents").notNull(),
  capacity: integer("capacity").notNull(),
  ticketsRemaining: integer("tickets_remaining").notNull(),
  imageUrl: varchar("image_url", { length: 500 }),
  organizerId: integer("organizer_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  venueId: integer("venue_id").references(() => venues.id, { onDelete: "set null" }),
  seatLayoutId: integer("seat_layout_id").references(() => seatLayouts.id, { onDelete: "set null" }),
  status: varchar("status", { length: 50 }).default("published").notNull(),
  scheduledPublishAt: timestamp("scheduled_publish_at", { mode: "date" }),
  isFeatured: boolean("is_featured").default(false).notNull(),
  earlyBirdCutoff: timestamp("early_bird_cutoff", { mode: "date" }),
  earlyBirdDiscountPercent: integer("early_bird_discount_percent").default(0).notNull(),
  dynamicPricingEnabled: boolean("dynamic_pricing_enabled").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    reference: varchar("reference", { length: 64 }).notNull().unique(),
    eventId: integer("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    stripeSessionId: varchar("stripe_session_id", { length: 255 }).notNull().unique(),
    quantity: integer("quantity").notNull().default(1),
    totalCents: integer("total_cents").notNull(),
    status: varchar("status", { length: 50 }).notNull().default("confirmed"), // 'confirmed' | 'cancelled' | 'transferred'
    seats: text("seats"), // JSON array of selected seat numbers, e.g. '["A-1", "A-2"]'
    couponCode: varchar("coupon_code", { length: 50 }),
    discountCents: integer("discount_cents").default(0).notNull(),
    isGuest: boolean("is_guest").default(false).notNull(),
    guestEmail: varchar("guest_email", { length: 255 }),
    guestName: varchar("guest_name", { length: 255 }),
    cancelledAt: timestamp("cancelled_at", { mode: "date" }),
    cancellationReason: text("cancellation_reason"),
    refundStatus: varchar("refund_status", { length: 50 }).default("none").notNull(), // 'none' | 'requested' | 'approved' | 'rejected' | 'refunded'
    refundAmountCents: integer("refund_amount_cents"),
    isCheckedIn: boolean("is_checked_in").default(false).notNull(),
    checkedInAt: timestamp("checked_in_at", { mode: "date" }),
    checkInCount: integer("check_in_count").default(0).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    sessionIdx: uniqueIndex("bookings_session_idx").on(table.stripeSessionId),
  })
);

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  discountType: varchar("discount_type", { length: 20 }).notNull().default("percentage"), // 'percentage' | 'fixed'
  discountValue: integer("discount_value").notNull(), // e.g. 20 (for 20%) or 10000 (for ₹100)
  minOrderCents: integer("min_order_cents").default(0).notNull(),
  maxDiscountCents: integer("max_discount_cents"),
  eventId: integer("event_id").references(() => events.id, { onDelete: "cascade" }),
  validUntil: timestamp("valid_until", { mode: "date" }),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  guestEmail: varchar("guest_email", { length: 255 }),
  guestName: varchar("guest_name", { length: 255 }),
  quantity: integer("quantity").default(1).notNull(),
  status: varchar("status", { length: 50 }).default("waiting").notNull(), // 'waiting' | 'notified' | 'claimed' | 'expired'
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const ticketTransfers = pgTable("ticket_transfers", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .references(() => bookings.id, { onDelete: "cascade" })
    .notNull(),
  fromUserId: integer("from_user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  toUserEmail: varchar("to_user_email", { length: 255 }).notNull(),
  toUserId: integer("to_user_id").references(() => users.id, { onDelete: "set null" }),
  transferCode: varchar("transfer_code", { length: 64 }).notNull().unique(),
  status: varchar("status", { length: 50 }).default("completed").notNull(), // 'pending' | 'completed' | 'cancelled'
  transferredAt: timestamp("transferred_at", { mode: "date" }).defaultNow().notNull(),
});

export const seatReservations = pgTable(
  "seat_reservations",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    seatNumber: varchar("seat_number", { length: 50 }).notNull(),
    tier: varchar("tier", { length: 50 }).notNull().default("standard"), // 'standard' | 'vip' | 'premium' | 'accessible'
    priceCents: integer("price_cents").notNull().default(0),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    status: varchar("status", { length: 50 }).notNull().default("held"), // 'held' | 'booked' | 'released'
    heldUntil: timestamp("held_until", { mode: "date" }),
    bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  }
);

export const favorites = pgTable(
  "favorites",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    eventId: integer("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    userEventIdx: uniqueIndex("favorites_user_event_idx").on(
      table.userId,
      table.eventId
    ),
  })
);

export const savedPaymentMethods = pgTable("saved_payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  type: varchar("type", { length: 50 }).notNull().default("card"), // 'card' | 'upi'
  cardBrand: varchar("card_brand", { length: 50 }), // 'Visa' | 'Mastercard' | 'RuPay'
  last4: varchar("last4", { length: 4 }),
  expMonth: integer("exp_month"),
  expYear: integer("exp_year"),
  upiId: varchar("upi_id", { length: 100 }),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const paymentLogs = pgTable("payment_logs", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  gateway: varchar("gateway", { length: 50 }).notNull().default("wallet"), // 'stripe' | 'razorpay' | 'cashfree' | 'phonepe' | 'paypal' | 'payu' | 'ccavenue' | 'bank_transfer' | 'cash_on_event' | 'free' | 'wallet'
  transactionId: varchar("transaction_id", { length: 255 }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("INR"),
  status: varchar("status", { length: 50 }).notNull().default("succeeded"), // 'initiated' | 'succeeded' | 'failed' | 'refunded'
  paymentMethodDetails: text("payment_method_details"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const webhookLogs = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  gateway: varchar("gateway", { length: 50 }).notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  payload: text("payload"),
  signature: varchar("signature", { length: 500 }),
  status: varchar("status", { length: 50 }).default("received").notNull(), // 'received' | 'processed' | 'failed' | 'ignored'
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const refunds = pgTable("refunds", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  gateway: varchar("gateway", { length: 50 }).notNull(),
  transactionId: varchar("transaction_id", { length: 255 }).notNull(),
  refundId: varchar("refund_id", { length: 255 }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 10 }).default("INR").notNull(),
  reason: text("reason"),
  status: varchar("status", { length: 50 }).default("succeeded").notNull(), // 'pending' | 'succeeded' | 'failed'
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("target_type", { length: 50 }).notNull(),
  targetId: varchar("target_id", { length: 100 }).notNull(),
  details: text("details"),
  ipAddress: varchar("ip_address", { length: 100 }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  channel: varchar("channel", { length: 50 }).notNull().default("in_app"),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  metadata: text("metadata"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  endpoint: text("endpoint").notNull(),
  keys: text("keys").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  rating: integer("rating").notNull(),
  title: varchar("title", { length: 255 }),
  comment: text("comment").notNull(),
  photoUrls: text("photo_urls"),
  organizerReply: text("organizer_reply"),
  organizerRepliedAt: timestamp("organizer_replied_at", { mode: "date" }),
  isReported: boolean("is_reported").default(false).notNull(),
  reportReason: varchar("report_reason", { length: 255 }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  organizerId: integer("organizer_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const eventLikes = pgTable("event_likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  eventId: integer("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const eventComments = pgTable("event_comments", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  parentId: integer("parent_id"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  referredUserId: integer("referred_user_id").references(() => users.id, { onDelete: "set null" }),
  code: varchar("code", { length: 32 }).notNull().unique(),
  rewardAmountCents: integer("reward_amount_cents").default(50000).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const loyaltyPoints = pgTable("loyalty_points", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  points: integer("points").notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const giftCards = pgTable("gift_cards", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  initialBalanceCents: integer("initial_balance_cents").notNull(),
  currentBalanceCents: integer("current_balance_cents").notNull(),
  senderId: integer("sender_id").references(() => users.id, { onDelete: "set null" }),
  recipientEmail: varchar("recipient_email", { length: 255 }),
  isClaimed: boolean("is_claimed").default(false).notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const memberships = pgTable("memberships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  tier: varchar("tier", { length: 32 }).default("silver").notNull(),
  discountPercent: integer("discount_percent").default(10).notNull(),
  validUntil: timestamp("valid_until", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderId: varchar("order_id", { length: 64 }).notNull().unique(),
  eventId: integer("event_id").references(() => events.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  gateway: varchar("gateway", { length: 50 }).notNull(),
  gatewayOrderId: varchar("gateway_order_id", { length: 255 }),
  quantity: integer("quantity").notNull().default(1),
  seats: text("seats"),
  subtotalCents: integer("subtotal_cents").notNull(),
  platformFeeCents: integer("platform_fee_cents").notNull().default(500),
  convenienceFeeCents: integer("convenience_fee_cents").notNull().default(2500),
  taxesCents: integer("taxes_cents").notNull().default(0),
  discountCents: integer("discount_cents").notNull().default(0),
  walletAmountCents: integer("wallet_amount_cents").notNull().default(0),
  totalAmountCents: integer("total_amount_cents").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("INR"),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // 'pending' | 'completed' | 'failed' | 'expired' | 'cancelled'
  couponCode: varchar("coupon_code", { length: 50 }),
  customerDetails: text("customer_details"),
  clientSecret: text("client_secret"),
  checkoutUrl: text("checkout_url"),
  gatewayPayload: text("gateway_payload"),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: varchar("order_id", { length: 64 }).references(() => orders.orderId, { onDelete: "set null" }),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  gateway: varchar("gateway", { length: 50 }).notNull(),
  gatewayPaymentId: varchar("gateway_payment_id", { length: 255 }).notNull(),
  gatewayOrderId: varchar("gateway_order_id", { length: 255 }),
  gatewaySignature: text("gateway_signature"),
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("INR"),
  status: varchar("status", { length: 50 }).notNull().default("initiated"), // 'initiated' | 'succeeded' | 'failed' | 'refunded' | 'expired' | 'cancelled'
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentMethodDetails: text("payment_method_details"),
  errorMessage: text("error_message"),
  rawPayload: text("raw_payload"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  transactionReference: varchar("transaction_reference", { length: 64 }).notNull().unique(),
  orderId: varchar("order_id", { length: 64 }),
  paymentId: integer("payment_id").references(() => payments.id, { onDelete: "set null" }),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  gateway: varchar("gateway", { length: 50 }).notNull(),
  type: varchar("type", { length: 50 }).notNull().default("charge"), // 'charge' | 'refund' | 'chargeback' | 'dispute'
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("INR"),
  status: varchar("status", { length: 50 }).notNull().default("succeeded"),
  gatewayResponse: text("gateway_response"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 64 }).notNull().unique(),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  eventId: integer("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  subtotalCents: integer("subtotal_cents").notNull(),
  platformFeeCents: integer("platform_fee_cents").notNull().default(500),
  convenienceFeeCents: integer("convenience_fee_cents").notNull().default(2500),
  taxesCents: integer("taxes_cents").notNull().default(0),
  discountCents: integer("discount_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("INR"),
  status: varchar("status", { length: 20 }).notNull().default("paid"), // 'paid' | 'void' | 'refunded'
  invoicePdfUrl: varchar("invoice_pdf_url", { length: 500 }),
  issuedAt: timestamp("issued_at", { mode: "date" }).defaultNow().notNull(),
});

export const receipts = pgTable("receipts", {
  id: serial("id").primaryKey(),
  receiptNumber: varchar("receipt_number", { length: 64 }).notNull().unique(),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "cascade" }).notNull(),
  orderId: varchar("order_id", { length: 64 }),
  transactionId: varchar("transaction_id", { length: 255 }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("INR"),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  gateway: varchar("gateway", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("completed"),
  issuedAt: timestamp("issued_at", { mode: "date" }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;
export type SavedPaymentMethod = typeof savedPaymentMethods.$inferSelect;
export type NewSavedPaymentMethod = typeof savedPaymentMethods.$inferInsert;
export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;
export type SeatLayout = typeof seatLayouts.$inferSelect;
export type NewSeatLayout = typeof seatLayouts.$inferInsert;
export type SeatReservation = typeof seatReservations.$inferSelect;
export type NewSeatReservation = typeof seatReservations.$inferInsert;
export type TicketTransfer = typeof ticketTransfers.$inferSelect;
export type NewTicketTransfer = typeof ticketTransfers.$inferInsert;
export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;
export type WaitlistEntry = typeof waitlist.$inferSelect;
export type NewWaitlistEntry = typeof waitlist.$inferInsert;
export type PaymentLog = typeof paymentLogs.$inferSelect;
export type NewPaymentLog = typeof paymentLogs.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type Follow = typeof follows.$inferSelect;
export type NewFollow = typeof follows.$inferInsert;
export type EventLike = typeof eventLikes.$inferSelect;
export type NewEventLike = typeof eventLikes.$inferInsert;
export type EventComment = typeof eventComments.$inferSelect;
export type NewEventComment = typeof eventComments.$inferInsert;
export type Referral = typeof referrals.$inferSelect;
export type NewReferral = typeof referrals.$inferInsert;
export type LoyaltyPoint = typeof loyaltyPoints.$inferSelect;
export type NewLoyaltyPoint = typeof loyaltyPoints.$inferInsert;
export type GiftCard = typeof giftCards.$inferSelect;
export type NewGiftCard = typeof giftCards.$inferInsert;
export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;
export type WebhookLog = typeof webhookLogs.$inferSelect;
export type NewWebhookLog = typeof webhookLogs.$inferInsert;
export type Refund = typeof refunds.$inferSelect;
export type NewRefund = typeof refunds.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type Receipt = typeof receipts.$inferSelect;
export type NewReceipt = typeof receipts.$inferInsert;

