# Gatherly - Relational Database Schema & ER Diagram

The Gatherly database is built on **PostgreSQL** and orchestrated through **Drizzle ORM** (`src/db/schema.ts`).

## Entity-Relationship Diagram

```mermaid
erDiagram
    users ||--o{ refresh_tokens : "owns"
    users ||--o{ sessions : "tracks"
    users ||--o{ venues : "manages"
    users ||--o{ events : "hosts"
    users ||--o{ bookings : "purchases"
    users ||--o{ saved_payment_methods : "saves"
    users ||--o{ notifications : "receives"
    users ||--o{ reviews : "writes"
    users ||--o{ follows : "follows organizer"
    users ||--o{ referrals : "refers"
    users ||--o{ loyalty_points : "accumulates"
    users ||--o{ memberships : "holds"

    venues ||--o{ seat_layouts : "contains"
    venues ||--o{ events : "hosts"

    seat_layouts ||--o{ events : "defines layout"
    seat_layouts ||--o{ seat_reservations : "reserves seats"

    events ||--o{ bookings : "contains"
    events ||--o{ seat_reservations : "tracks seats"
    events ||--o{ waitlist : "enqueues"
    events ||--o{ reviews : "collects"
    events ||--o{ event_likes : "receives likes"
    events ||--o{ event_comments : "hosts discussion"

    bookings ||--o{ payment_logs : "records payments"
    bookings ||--o{ ticket_transfers : "transfers"

    users {
        serial id PK
        varchar name
        varchar email UK
        varchar password_hash
        varchar role "attendee | organizer | admin"
        text avatar_url
        boolean is_email_verified
        boolean mfa_enabled
        varchar mfa_secret
        boolean is_verified_organizer
        integer wallet_balance_cents
    }

    events {
        serial id PK
        varchar title
        text description
        varchar category
        varchar location
        timestamp starts_at
        timestamp ends_at
        integer ticket_price_cents
        integer capacity
        integer tickets_remaining
        integer organizer_id FK
        integer venue_id FK
        integer seat_layout_id FK
        varchar status "published | draft | scheduled"
        boolean is_featured
        timestamp early_bird_cutoff
        integer early_bird_discount_percent
        boolean dynamic_pricing_enabled
    }

    venues {
        serial id PK
        varchar name
        varchar address
        varchar city
        integer capacity
        boolean is_approved
    }

    seat_layouts {
        serial id PK
        varchar name
        integer venue_id FK
        integer rows
        integer columns
        text tiers_config
    }

    seat_reservations {
        serial id PK
        integer event_id FK
        varchar seat_number
        varchar status "available | held | booked"
        timestamp held_until
    }

    bookings {
        serial id PK
        varchar reference UK
        integer event_id FK
        integer userId FK
        integer quantity
        integer total_cents
        varchar status "confirmed | cancelled | transferred"
        text seats
        boolean is_checked_in
        timestamp checked_in_at
        integer check_in_count
    }

    reviews {
        serial id PK
        integer event_id FK
        integer user_id FK
        integer rating
        varchar title
        text comment
        text organizer_reply
        boolean is_reported
    }

    notifications {
        serial id PK
        integer user_id FK
        varchar channel "in_app | email | sms | whatsapp | push"
        varchar type
        varchar title
        text message
        boolean is_read
    }

    audit_logs {
        serial id PK
        integer actor_id FK
        varchar action
        varchar target_type
        varchar target_id
        text details
        varchar ip_address
    }
```
