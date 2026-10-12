# Gatherly - Modern Event & Ticket Management Platform

A modern, full-stack event discovery, booking, and ticket management platform built with **Next.js 16**, **React 19**, **PostgreSQL**, **Drizzle ORM**, and **Tailwind CSS**. Inspired by BookMyShow, Gatherly provides a seamless experience for both attendees looking to book tickets and organizers managing live events.

---

## Features

### For Attendees
- **Multi-Category Discovery**: Browse and filter events across **Movies**, **Stream**, **Events**, **Plays**, **Sports**, and **Activities**.
- **Instant Search & Filters**: Search shows by title or filter by category and date.
- **Secure Ticket Booking**: Integrated ticket checkout powered by **Stripe**.
- **Digital Tickets & QR Codes**: Instant booking confirmations with scannable QR codes.
- **Downloadable PDF Tickets**: Export official PDF event passes directly from the tickets portal.
- **Ticket History**: Dedicated "My Tickets" section to review past and upcoming bookings.

### For Organizers
- **Organizer Dashboard**: Real-time stats on capacity, bookings, and remaining tickets.
- **List Your Show**: Intuitive form to create and publish events with custom posters, dates, and pricing.
- **Attendee Management**: View full attendee rosters and booking references for each event.
- **Show Controls**: Edit and delete listings as needed.

### Security & Architecture
- **Role-Based Authentication**: Secure JWT stored in `httpOnly` cookies with bcryptjs password hashing.
- **Separation of Concerns**: Granular access control for `organizer` and `attendee` roles.
- **Database Architecture**: Type-safe database queries and migrations powered by **Drizzle ORM**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router & Turbopack) |
| **Frontend** | React 19, Tailwind CSS, Framer Motion, Lucide Icons |
| **State Management** | Zustand |
| **Database** | PostgreSQL |
| **ORM** | Drizzle ORM & Drizzle Kit |
| **Payments** | Stripe API |
| **Ticketing & QR** | PDFKit & QRCode |
| **Authentication** | JWT (`jsonwebtoken`) & `bcryptjs` |

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.18+ or v20+)
- [PostgreSQL](https://www.postgresql.org/) (local installation or cloud database like [Neon](https://neon.tech/))

---

### Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd "d:/College/Mini Project/event management"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root folder with the following variables:
   ```env
   # PostgreSQL Connection String
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/event_management"

   # JWT Authentication Secret
   JWT_SECRET="super_secret_key_for_development"

   # Stripe API Key (Test Mode)
   STRIPE_SECRET_KEY="sk_test_..."
   ```

4. **Initialize Database Schema**:
   Push the schema to your PostgreSQL database:
   ```bash
   npm run db:push
   ```

5. **Seed Demo Data & Accounts**:
   Populate the database with sample events and demo credentials:
   ```bash
   npm run db:seed
   ```

6. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Demo Accounts

You can click the 1-click demo buttons on the [Sign In page](http://localhost:3000/login) or enter:

| Role | Email | Password |
|---|---|---|
| **Organizer** | `organizer@demo.com` | `password123` |
| **Attendee** | `attendee@demo.com` | `password123` |

---

## Project Structure

```text
├── drizzle/                # Database migrations & SQL snapshots
├── src/
│   ├── app/
│   │   ├── api/            # Route handlers (auth, events, checkout, bookings)
│   │   ├── bookings/       # User ticket history & confirmation pages
│   │   ├── checkout/       # Stripe checkout session handlers
│   │   ├── dashboard/      # Organizer portal & event management
│   │   ├── events/         # Category discovery & event details
│   │   ├── login/          # User authentication (Sign in)
│   │   ├── register/       # User registration (Sign up)
│   │   ├── layout.tsx      # Root application layout
│   │   └── page.tsx        # Landing homepage
│   ├── components/         # Reusable UI components (Navbar, Hero, etc.)
│   ├── db/
│   │   ├── index.ts        # Database connection pool
│   │   ├── schema.ts       # Drizzle schema (users, events, bookings)
│   │   └── seed.ts         # Database seeder script
│   ├── lib/                # JWT utilities, auth guards, PDF ticket generators
│   └── store/              # Zustand global client auth state
├── drizzle.config.ts       # Drizzle Kit configuration
├── package.json            # Scripts & dependencies
└── tsconfig.json           # TypeScript configuration
```

---

## Available Scripts

- `npm run dev`: Runs the local development server with Turbopack.
- `npm run build`: Compiles and builds the production bundle.
- `npm run start`: Runs the built production server.
- `npm run db:push`: Pushes schema definitions directly to the database.
- `npm run db:seed`: Seeds sample shows and demo accounts.
- `npm run typecheck`: Validates TypeScript types across the codebase.
- `npm run lint`: Runs ESLint checks.

---

## Deployment (Vercel)

1. Provision a free PostgreSQL database on **[Neon.tech](https://neon.tech/)** or **Supabase**.
2. Run migrations and seed the cloud database:
   ```bash
   DATABASE_URL="your-neon-cloud-url" npm run db:push
   DATABASE_URL="your-neon-cloud-url" npm run db:seed
   ```
3. Push the repository to GitHub:
   ```bash
   git add .
   git commit -m "Deploy Gatherly to Vercel"
   git push origin main
   ```
4. Import the repository into **[Vercel](https://vercel.com/)** and configure the environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `STRIPE_SECRET_KEY`
5. Click **Deploy**.
