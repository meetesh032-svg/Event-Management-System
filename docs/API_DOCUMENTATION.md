# Gatherly - RESTful API Reference Documentation

All endpoints return JSON responses and support standardized HTTP status codes:
- `200 OK` / `201 Created`
- `400 Bad Request`
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`
- `409 Conflict` (Seat hold collision)
- `429 Too Many Requests` (Rate limit exceeded)

---

## 1. Authentication (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user account |
| `POST` | `/api/auth/login` | Login with email & password, returns JWT & refresh token |
| `POST` | `/api/auth/logout` | Revoke session and clear cookies |
| `GET` | `/api/auth/me` | Fetch active user identity |
| `POST` | `/api/auth/mfa/setup` | Generate TOTP QR seed for Google Authenticator |
| `POST` | `/api/auth/mfa/verify` | Verify 6-digit TOTP code and enable MFA |
| `POST` | `/api/auth/forgot-password` | Request password reset token |
| `POST` | `/api/auth/reset-password` | Reset password using verified token |
| `GET` | `/api/auth/sessions` | List active user devices and sessions |
| `DELETE` | `/api/auth/sessions/:id` | Terminate a remote device session |

---

## 2. Events & Discovery (`/api/events`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/events` | List events with category, search, and pagination |
| `POST` | `/api/events` | Create new event (Organizer only) |
| `GET` | `/api/events/:id` | Get event details with organizer badges |
| `PUT` | `/api/events/:id` | Update event information |
| `DELETE` | `/api/events/:id` | Delete event listing |
| `POST` | `/api/events/:id/clone` | Duplicate an existing event |
| `GET` | `/api/events/discovery` | Multi-field search, city, and similar event discovery |
| `GET` | `/api/events/:id/live` | Real-time countdown, active viewers, and tickets scarcity |
| `POST` | `/api/events/:id/waitlist` | Enqueue on sold-out event waitlist |
| `GET` | `/api/events/:id/attendees/export` | Download attendee roster as CSV |

---

## 3. Seats & Venues (`/api/events/:id/seats`, `/api/venues`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/events/:id/seats` | Get seat grid with tiers and availability |
| `POST` | `/api/events/:id/seats/hold` | Atomically lock seats for 7 minutes |
| `POST` | `/api/events/:id/seats/release` | Manually release held seats |
| `GET, POST` | `/api/venues` | List or create venues |
| `GET, PUT` | `/api/venues/:id` | Get or update venue and interactive layout |

---

## 4. Bookings & Digital Ticketing (`/api/bookings`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/checkout` | Start multi-seat checkout with guest support |
| `POST` | `/api/bookings/:id/retry` | Retry a failed payment attempt |
| `GET` | `/api/bookings/:id/ticket` | Stream official PDF ticket pass with QR code |
| `GET` | `/api/bookings/:id/invoice` | Stream official GST tax invoice PDF |
| `POST` | `/api/bookings/:id/transfer` | Transfer ticket pass ownership to friend's email |
| `POST` | `/api/bookings/:id/cancel` | Cancel booking and request automated refund |

---

## 5. Gate Check-in & Scanner (`/api/events/:id`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/events/:id/check-in` | Gate usher QR scan with duplicate detection |
| `GET` | `/api/events/:id/attendance` | Real-time gate occupancy and check-in metrics |
| `GET` | `/api/events/:id/manifest` | Download offline JSON manifest for gate scanners |

---

## 6. Social, Reviews & Community (`/api/events/:id`)
| Method | Endpoint | Description |
|---|---|---|
| `GET, POST` | `/api/events/:id/reviews` | View or submit 5-star event reviews with photos |
| `POST` | `/api/reviews/:id/reply` | Host public reply to attendee review |
| `POST` | `/api/reviews/:id/report` | Flag review for moderator abuse review |
| `GET, POST` | `/api/events/:id/likes` | Toggle event like counter |
| `GET, POST` | `/api/events/:id/comments` | Attendee Q&A discussion thread |
| `POST` | `/api/events/:id/invite` | Email event invitation with referral link |
| `GET, POST` | `/api/organizers/:id/follow` | Follow/unfollow organizer with follower count |

---

## 7. AI Engine (`/api/ai`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ai/generate` | Generate descriptions, SEO metadata, banner prompts, or fraud risk score |
| `GET` | `/api/ai/recommendations` | Personalized event recommendations based on attendee affinity |
| `POST` | `/api/ai/chatbot` | Natural language event discovery assistant |

---

## 8. Marketing & Rewards (`/api/marketing`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/marketing/referrals` | Fetch user's referral code and rewards earnings |
| `GET` | `/api/marketing/loyalty` | Fetch loyalty points balance and VIP Club tier |
| `POST` | `/api/marketing/gift-cards` | Verify or redeem gift card into Gatherly wallet |
| `GET` | `/api/marketing/pricing/:id` | Calculate dynamic demand surge and early bird price |
