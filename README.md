# Gatherly - Event & Ticket Management Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.6-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45.2-C5F74F?style=flat&logo=drizzle)](https://orm.drizzle.team/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-635bff?style=flat&logo=stripe)](https://stripe.com/)

**Gatherly** is a modern, full-stack event discovery, booking, and automated ticketing management platform. Inspired by BookMyShow, Gatherly delivers an end-to-end experience for attendees discovering live entertainment and organizers managing listings, inventory, and attendee rosters.

Developed as a **Computer Science & Engineering Mini Project**, featuring a modular full-stack architecture, type-safe database queries, atomic concurrency control, automated PDF ticket generation, scannable QR codes, and dual payment gateways.

---

## Table of Contents

- [Features](#features)
  - [For Attendees](#for-attendees)
  - [For Organizers](#for-organizers)
  - [Security & Data Integrity](#security--data-integrity)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Setup](#installation--setup)
  - [Environment Variables](#environment-variables)
- [Demo Credentials](#demo-credentials)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Academic Presentation & Mini Project Deliverables](#academic-presentation--mini-project-deliverables)
- [Deployment (Vercel & Neon)](#deployment-vercel--neon)

---

## Features

### For Attendees
- **Multi-Category Discovery**: Browse events across **Movies**, **Stream**, **Events**, **Plays**, **Sports**, **Activities**, **Music**, **Tech**, **Food**, and **Business**.
- **Real-Time Search & Filtering**: Debounced search by title with instant category pills and dynamic URL query synchronization (`?category=sports&search=...`).
- **Indian Rupee (₹ INR) Pricing**: All ticket prices stored and displayed in Indian Rupees (`formatPrice` / `formatRupees`).
- **Dual Payment Processing**:
  - **Interactive Indian Payment Gateway**: High-fidelity simulated checkout featuring **UPI** (GPay, PhonePe, Paytm, BHIM), **Credit/Debit Cards** (Visa, Mastercard, RuPay), **Net Banking** (HDFC, SBI, ICICI, Axis), and **Wallets**.
  - **Stripe Checkout**: Integrated card checkout with automated webhook fulfillment (`checkout.session.completed`).
- **Automated Digital Tickets**:
  - **Programmatic PDF Passes**: High-resolution, vector-rendered A4 event tickets generated on-the-fly via **PDFKit**.
  - **Scannable QR Codes**: Cryptographically hashed 64-character booking references embedded directly into passes for gate verification.
- **Automated Email Delivery**: Transactional confirmation emails with attached PDF passes sent directly via **Nodemailer** upon booking confirmation.
- **"My Tickets" Portal**: View past and upcoming confirmed passes with single-click PDF re-downloading at `/bookings`.

### For Organizers
- **Organizer Dashboard**: Real-time operational metrics tracking total shows hosted, ticket capacity, tickets remaining, and booked count.
- **Create & Publish Events**: Multi-field event creation form with validation for title, schedule, venue location, ticket price, and capacity.
- **Image Poster Uploads**: Direct image poster uploads via `/api/upload` saved to the public media directory or external image URL support.
- **Live Attendee Rosters**: View attendee names, emails, booking references, ticket counts, and booking timestamps for each event (`/dashboard/events/[id]/attendees`).
- **Event Controls**: Delete events with automatic cascading cleanup of associated bookings.

### Security & Data Integrity
- **Role-Based Access Control (RBAC)**: Strict segregation between `organizer` (event hosts) and `attendee` (ticket buyers).
- **Stateless Authentication**: Signed JSON Web Tokens (JWT) stored in tamper-proof `httpOnly`, `SameSite: Lax` cookies, protecting against XSS and CSRF attacks.
- **Bcrypt Password Hashing**: Passwords salted and hashed with 10 salt rounds before storage.
- **Atomic Inventory Control**: Conditional SQL decrement prevents ticket overselling during concurrent checkouts:
  ```sql
  UPDATE events SET tickets_remaining = tickets_remaining - 1 WHERE id = :id AND tickets_remaining >= 1
  ```
- **Idempotency & Deduplication**: Unique database index on `stripe_session_id` ensures safe page reloads and prevents duplicate ticket allocation.
- **Integer Currency Standards**: Stored as integer paise/cents (`ticketPriceCents`, `totalCents`) to eliminate floating-point rounding errors.

---

## System Architecture

```mermaid
flowchart TD
    subgraph Client [Client Layer - React 19 / Next.js 16]
        UI[User Interface & Navbar]
        Discovery[Event Discovery & Search]
        CheckoutUI[Checkout Gateway UPI / Card]
        OrganizerUI[Organizer Dashboard]
        TicketsUI[My Tickets Portal]
    end

    subgraph Server [Server Layer - App Router & Edge-Ready APIs]
        AuthGuard[Auth Guard & JWT Verifier]
        EventsAPI[/api/events/]
        CheckoutAPI[/api/checkout/]
        BookingsAPI[/api/bookings/]
        UploadAPI[/api/upload/]
        WebhookAPI[/api/webhook/stripe]
    end

    subgraph CoreServices [Core Application Services]
        BookingEngine[Booking & Concurrency Engine]
        PDFService[PDFKit Ticket Generator]
        QRService[QRCode Buffer Engine]
        EmailService[Nodemailer SMTP Transporter]
    end

    subgraph Data [Data Layer]
        Drizzle[Drizzle ORM & Drizzle Kit]
        PostgreSQL[(PostgreSQL Relational DB)]
    end

    UI --> AuthGuard
    Discovery --> EventsAPI
    CheckoutUI --> CheckoutAPI
    OrganizerUI --> EventsAPI
    OrganizerUI --> UploadAPI
    TicketsUI --> BookingsAPI

    AuthGuard --> Drizzle
    EventsAPI --> Drizzle
    CheckoutAPI --> BookingEngine
    WebhookAPI --> BookingEngine
    BookingsAPI --> Drizzle

    BookingEngine --> Drizzle
    BookingEngine --> QRService
    BookingEngine --> PDFService
    BookingEngine --> EmailService

    PDFService --> BookingsAPI
    Drizzle --> PostgreSQL
```

---

## Tech Stack

| Category | Technology | Description |
|---|---|---|
| **Framework** | **Next.js 16.2.6** | React framework with App Router, Server Components & Turbopack |
| **Frontend** | **React 19.2.6** | Modern component rendering and concurrency model |
| **Styling** | **Tailwind CSS v4** | High-performance, zero-runtime utility-first CSS |
| **Animations** | **Framer Motion 12** | Fluid layout transitions, smooth entrance effects, and modal dialogs |
| **Icons** | **Lucide React** | Modern, lightweight SVG vector icon set |
| **State Management** | **Zustand 5** | Lightweight client-side authentication store (`/store/auth.ts`) |
| **Database** | **PostgreSQL** | Relational SQL database (local or Neon Serverless) |
| **ORM** | **Drizzle ORM 0.45.2** | Lightweight, type-safe SQL query builder & schema definitions |
| **Schema Migrations**| **Drizzle Kit 0.31** | Schema synchronization and database push utilities |
| **Payment Gateway** | **Stripe API 22.4** | Official Stripe Checkout sessions and signature verification |
| **PDF Generation** | **PDFKit 0.19** | Programmatic vector PDF generation for official event passes |
| **QR Generation** | **QRCode 1.5** | Cryptographic booking reference QR code matrix buffer generator |
| **Transactional Email**| **Nodemailer 9.0** | SMTP mail delivery with automated PDF ticket attachments |
| **Authentication** | **JWT & BcryptJS** | Stateless JWT tokens in `httpOnly` cookies & salted password hashing |
| **Language** | **TypeScript 5.9** | Strict end-to-end type safety across client and server |

---

## Database Schema

Defined in [`src/db/schema.ts`](src/db/schema.ts) using Drizzle ORM:

```mermaid
erDiagram
    users ||--o{ events : "hosts / organizes"
    users ||--o{ bookings : "purchases"
    events ||--o{ bookings : "has"

    users {
        serial id PK
        varchar name
        varchar email UK
        varchar passwordHash
        userRoleEnum role "attendee | organizer"
        timestamp createdAt
    }

    events {
        serial id PK
        varchar title
        text description
        varchar category
        varchar location
        timestamp startsAt
        timestamp endsAt
        integer ticketPriceCents "stored in paise/cents"
        integer capacity
        integer ticketsRemaining
        varchar imageUrl
        integer organizerId FK
        timestamp createdAt
    }

    bookings {
        serial id PK
        varchar reference UK "EVT-timestamp-hash"
        integer eventId FK
        integer userId FK
        varchar stripeSessionId UK "unique indexed"
        integer quantity
        integer totalCents
        varchar status "confirmed"
        timestamp createdAt
    }
```

---

## API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new user account (`name`, `email`, `password`, `role`) |
| `POST` | `/api/auth/login` | Public | Authenticate user credentials, sets `httpOnly` JWT session cookie |
| `POST` | `/api/auth/logout` | Authenticated | Clears JWT session cookie and terminates active session |
| `GET` | `/api/auth/me` | Public | Returns current authenticated user profile (`id`, `name`, `email`, `role`) |

### Events (`/api/events`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/events` | Public | Retrieve events with optional filters (`?category=...&search=...&limit=...`) |
| `POST` | `/api/events` | Organizer | Create a new event listing (title, category, venue, dates, price, capacity) |
| `GET` | `/api/events/:id` | Public | Retrieve full details of a specific event |
| `PUT` | `/api/events/:id` | Organizer (Owner)| Update an existing event listing |
| `DELETE`| `/api/events/:id` | Organizer (Owner)| Delete an event and cascade-remove associated bookings |
| `GET` | `/api/events/:id/attendees`| Organizer (Owner)| Retrieve list of attendees and booking records for this show |

### Checkout & Bookings (`/api/checkout`, `/api/bookings`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/checkout` | Attendee | Initiates checkout session for a selected event |
| `GET` | `/api/checkout/confirm` | Attendee | Verifies session payment status and confirms ticket booking |
| `POST` | `/api/webhook/stripe` | Stripe | Webhook endpoint verifying `stripe-signature` for background confirmation |
| `GET` | `/api/bookings` | Authenticated | Retrieve booking history for the logged-in attendee |
| `GET` | `/api/bookings/:id/ticket` | Attendee / Host | Stream vector PDF event ticket with embedded scannable QR code |

### Media Upload & System
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/upload` | Organizer | Upload event cover images (`multipart/form-data`) saved to `public/uploads` |
| `GET` | `/api/health` | Public | Healthcheck endpoint reporting server and database operational status |

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (`v18.18+` or `v20+`)
- [PostgreSQL](https://www.postgresql.org/) (Local PostgreSQL instance or cloud database such as [Neon](https://neon.tech/) / [Supabase](https://supabase.com/))
- [Git](https://git-scm.com/)

---

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/event-management.git
   cd event-management
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory (see [Environment Variables](#environment-variables)):
   ```env
   # PostgreSQL Connection String
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/event_management"

   # JWT Authentication Secret
   JWT_SECRET="your_super_secret_jwt_key_gatherly"

   # Stripe API Key (Optional for simulated gateway, required for live Stripe)
   STRIPE_SECRET_KEY="sk_test_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."

   # Application Base URL
   NEXT_PUBLIC_APP_URL="http://localhost:3000"

   # Optional SMTP Settings for Ticket Emails (Skipped safely in dev if omitted)
   # SMTP_HOST="smtp.gmail.com"
   # SMTP_PORT="587"
   # SMTP_USER="your-email@gmail.com"
   # SMTP_PASS="your-app-password"
   # EMAIL_FROM="Gatherly Tickets <tickets@gatherly.com>"
   ```

4. **Push Database Schema**:
   Sync table structures directly to your PostgreSQL database:
   ```bash
   npm run db:push
   ```

5. **Seed Demo Data & Sample Accounts**:
   Populate the database with demo accounts, movies, plays, and live concerts:
   ```bash
   npm run db:seed
   ```

6. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

### Environment Variables

| Variable | Required | Default / Example | Purpose |
|---|:---:|---|---|
| `DATABASE_URL` | **Yes** | `postgresql://user:pass@localhost:5432/event_management` | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | `your_secret_key_minimum_32_chars` | Secret key for signing stateless session JWTs |
| `STRIPE_SECRET_KEY` | Optional | `sk_test_...` | Stripe secret key for live/test Stripe payments |
| `STRIPE_WEBHOOK_SECRET` | Optional | `whsec_...` | Stripe webhook signing secret for event verification |
| `NEXT_PUBLIC_APP_URL` | Optional | `http://localhost:3000` | Application root URL for checkout redirects |
| `SMTP_HOST` | Optional | `smtp.gmail.com` | SMTP server host for sending ticket confirmation emails |
| `SMTP_PORT` | Optional | `587` | SMTP port (e.g. 587 for TLS, 465 for SSL) |
| `SMTP_USER` | Optional | `your-email@gmail.com` | SMTP authentication username |
| `SMTP_PASS` | Optional | `app-specific-password` | SMTP authentication password |
| `EMAIL_FROM` | Optional | `tickets@gatherly.com` | Sender address shown on ticket emails |

> [!NOTE]
> If SMTP credentials are not configured, Gatherly logs a graceful notification in the console and continues without interruption. All tickets remain directly downloadable from the user's **My Tickets** portal.

---

## Demo Credentials

The login page includes convenient **1-Click Demo Login** buttons for instant presentation and review:

| Role | Email | Password | Access Privileges |
|---|---|---|---|
| **Organizer** | `organizer@demo.com` | `password123` | Create shows, view attendee rosters, delete events, review capacity |
| **Attendee** | `attendee@demo.com` | `password123` | Browse shows, purchase tickets, view "My Tickets", download PDF passes |

---

## Project Structure

```text
event-management/
├── drizzle/                          # Drizzle ORM migrations & snapshots
├── public/
│   ├── uploads/                      # Uploaded event cover posters
│   └── placeholder-event.jpg         # Default fallback event banner
├── src/
│   ├── app/
│   │   ├── api/                      # Next.js Server Route Handlers
│   │   │   ├── auth/                 # Login, register, logout, me routes
│   │   │   ├── bookings/             # Booking records & PDF ticket streaming
│   │   │   │   └── [id]/ticket/      # /api/bookings/:id/ticket (PDFKit download)
│   │   │   ├── checkout/             # Checkout initiation & confirmation
│   │   │   │   └── confirm/          # Session verification callback
│   │   │   ├── events/               # Event listing, creation, and detail routes
│   │   │   │   └── [id]/attendees/   # Organizer attendee roster API
│   │   │   ├── health/               # Operational healthcheck endpoint
│   │   │   ├── upload/               # Media upload route for event posters
│   │   │   └── webhook/stripe/       # Stripe webhook verification handler
│   │   ├── bookings/                 # Attendee ticket history portal
│   │   │   └── success/              # Post-checkout confirmation screen
│   │   ├── checkout/fake/            # Interactive Indian payment gateway (UPI/Cards)
│   │   ├── dashboard/                # Organizer management portal
│   │   │   └── events/
│   │   │       ├── [id]/attendees/   # Attendee roster viewer table
│   │   │       └── new/              # "Create a new event" form page
│   │   ├── events/                   # Discovery catalog & category filter page
│   │   │   └── [id]/                 # Event detail page & booking trigger
│   │   ├── login/                    # Sign-in page with 1-click demo buttons
│   │   ├── register/                 # Account registration page
│   │   ├── globals.css               # Global Tailwind CSS styles
│   │   ├── layout.tsx                # App root layout with Navbar & Auth bootstrap
│   │   └── page.tsx                  # Landing homepage (Hero + Recommendations)
│   ├── components/                   # Reusable UI Components
│   │   ├── HeroEvents.tsx            # Recommended events carousel
│   │   ├── HeroSection.tsx           # Hero promotion banner & call-to-actions
│   │   └── Navbar.tsx                # Dynamic navigation bar with role badges
│   ├── db/
│   │   ├── index.ts                  # PostgreSQL connection pool configuration
│   │   ├── schema.ts                 # Drizzle relational tables & TypeScript types
│   │   └── seed.ts                   # Comprehensive database seeder script
│   ├── lib/                          # Server utilities & helper libraries
│   │   ├── auth.ts                   # Role guards (`requireAuth`, `requireOrganizer`)
│   │   ├── booking.ts                # Concurrency-safe ticket creation pipeline
│   │   ├── email.ts                  # Nodemailer ticket email dispatcher
│   │   ├── format.ts                 # Indian Rupee (₹ INR) currency formatters
│   │   ├── jwt.ts                    # JWT signing and verification helpers
│   │   ├── pdf.ts                    # PDFKit vector event ticket generator
│   │   ├── qr.ts                     # QRCode PNG buffer generator
│   │   └── stripe.ts                 # Stripe SDK client instance
│   └── store/
│       └── auth.ts                   # Client-side Zustand authentication store
├── drizzle.config.ts                 # Drizzle Kit configuration
├── eslint.config.mjs                 # ESLint rules and Next.js lint plugin
├── generate_pdf.js                   # Programmatic presentation slide PDF builder
├── Gatherly_Project_Presentation.pdf # Compiled 18-slide academic presentation PDF
├── next.config.ts                    # Next.js configuration
├── package.json                      # Project dependencies & scripts
├── presentation.html                 # Interactive slide presentation viewer
├── tsconfig.json                     # TypeScript compiler configuration
└── README.md                         # Project documentation
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts local Next.js development server with hot-reload |
| `npm run build` | Compiles and builds optimized production bundle |
| `npm run start` | Launches built production server |
| `npm run typecheck` | Runs strict TypeScript compiler check (`tsc --noEmit`) |
| `npm run lint` | Runs ESLint 9 code inspection |
| `npm run db:push` | Pushes Drizzle schema definitions directly to PostgreSQL |
| `npm run db:seed` | Seeds database with demo accounts, sample events, and shows |
| `node generate_pdf.js` | Rebuilds the 18-slide academic presentation PDF |

---

## Academic Presentation & Mini Project Deliverables

For project reviews, demonstrations, and viva evaluations, the repository contains complete academic presentation assets:

1. **18-Slide Landscape Presentation PDF**:
   - File: [`Gatherly_Project_Presentation.pdf`](Gatherly_Project_Presentation.pdf)
   - Built programmatically via [`generate_pdf.js`](generate_pdf.js) using PDFKit.
   - Formatted in 16:9 widescreen landscape with professional slide cards, clear typography, and zero layout clutter.

2. **Interactive Presentation Slides**:
   - File: [`presentation.html`](presentation.html)
   - Open directly in any browser (Chrome, Edge, Firefox) for an interactive slide deck with keyboard navigation.

### 4-Member Team Responsibility Matrix

| Member & Role | Core Focus | Key Deliverables |
|---|---|---|
| **Member 1: Full-Stack Architect & Backend Lead** | Next.js 16 App Router & Security | • RESTful route handlers (`/api/auth`, `/api/events`, `/api/bookings`)<br/>• Stateless JWT auth in `httpOnly` cookies with bcryptjs<br/>• Server-side role permission guards (`requireOrganizer`) |
| **Member 2: Frontend Lead & UI/UX Developer** | React 19, Tailwind CSS v4 & UI | • BookMyShow-inspired UI design & responsive layouts<br/>• Multi-category filtering and real-time search with URL sync<br/>• Organizer dashboard and Attendee "My Tickets" portals |
| **Member 3: Database & ORM Engineer** | PostgreSQL, Drizzle ORM & Integrity | • Relational schema design with foreign keys and cascade rules<br/>• Atomic inventory control preventing ticket overselling<br/>• Idempotent booking indexes and automated database seeder |
| **Member 4: Payment, Ticketing & DevOps Engineer** | Stripe, PDFKit, QR & Deployment | • Dual payment integration (Interactive Indian Gateway + Stripe)<br/>• Automated PDFKit vector passes with embedded QR codes<br/>• Nodemailer transactional email delivery & cloud deployment |

---

## Deployment (Vercel & Neon)

### 1. Provision Cloud Database (Neon)
1. Create a free PostgreSQL database on [Neon.tech](https://neon.tech/).
2. Copy the pooled connection string (with `sslmode=require`).

### 2. Push Schema & Seed Cloud Database
```bash
# Push schema to cloud database
DATABASE_URL="your-neon-cloud-database-url" npm run db:push

# Seed cloud database with initial sample shows and demo accounts
DATABASE_URL="your-neon-cloud-database-url" npm run db:seed
```

### 3. Deploy to Vercel
1. Push your repository to [GitHub](https://github.com/).
2. Import the project into [Vercel](https://vercel.com/).
3. Add the required Environment Variables in the Vercel Dashboard:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET` (optional)
   - `NEXT_PUBLIC_APP_URL` (set to your Vercel deployment URL)
4. Click **Deploy**. Vercel will automatically build and publish the production site.

---

## License

This project was developed for educational and academic evaluation purposes as a College Mini Project.
Feel free to use and adapt it for learning full-stack web development.
