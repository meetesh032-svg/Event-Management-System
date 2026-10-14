const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const outputPath = path.join(__dirname, 'Gatherly_Project_Presentation.pdf');
const doc = new PDFDocument({
  size: 'A4',
  layout: 'landscape',
  margin: 35,
  autoFirstPage: false
});

const writeStream = fs.createWriteStream(outputPath);
doc.pipe(writeStream);

// Color Palette
const COLORS = {
  primary: '#2563eb',       // Blue 600
  primaryDark: '#1d4ed8',   // Blue 700
  secondary: '#4f46e5',     // Indigo 600
  darkBg: '#0f172a',        // Slate 900
  cardBg: '#f8fafc',        // Slate 50
  cardBorder: '#cbd5e1',    // Slate 300
  textPrimary: '#0f172a',   // Slate 900
  textSecondary: '#334155', // Slate 700
  textMuted: '#64748b',     // Slate 500
  badgeBg: '#e0e7ff',       // Indigo 100
  badgeText: '#3730a3',     // Indigo 800
  white: '#ffffff'
};

// Dimensions for Landscape A4: 841.89 x 595.28
const PAGE_W = 841.89;
const PAGE_H = 595.28;
const M = 35;
const CONTENT_W = PAGE_W - (M * 2); // 771.89

function drawHeader(doc, slideNum, totalSlides, roleBadge, slideTitle) {
  // Top Header Bar
  doc.rect(M, M, CONTENT_W, 68).fillAndStroke('#f1f5f9', '#cbd5e1');
  
  // Role Pill Badge
  doc.roundedRect(M + 14, M + 12, 285, 20, 4).fillAndStroke(COLORS.badgeBg, '#c7d2fe');
  doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.badgeText);
  doc.text(roleBadge, M + 20, M + 17, { width: 275, ellipsis: true });

  // Project Tag (Right aligned)
  doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.primary);
  doc.text('Gatherly | Event Management System (4 Members)', M, M + 17, { width: CONTENT_W - 16, align: 'right' });

  // Main Slide Title
  doc.fontSize(18).font('Helvetica-Bold').fillColor(COLORS.textPrimary);
  doc.text(slideTitle, M + 14, M + 38, { width: CONTENT_W - 28 });
}

function drawFooter(doc, slideNum, totalSlides) {
  const footerY = PAGE_H - M - 20;
  doc.moveTo(M, footerY).lineTo(PAGE_W - M, footerY).strokeColor('#e2e8f0').lineWidth(1).stroke();
  
  doc.fontSize(9.5).font('Helvetica').fillColor(COLORS.textMuted);
  doc.text('Mini Project Presentation | Team of 4 Members', M, footerY + 6);
  doc.font('Helvetica-Bold').text(`Slide ${slideNum} of ${totalSlides}`, M, footerY + 6, { width: CONTENT_W, align: 'right' });
}

function drawTwoCards(doc, leftCard, rightCard) {
  const cardY = M + 80;
  const cardW = (CONTENT_W - 18) / 2; // ~376 pt each
  const cardH = 395; // Full spacious height without viva clutter

  // Left Card
  doc.roundedRect(M, cardY, cardW, cardH, 8).fillAndStroke(COLORS.cardBg, COLORS.cardBorder);
  // Left Card Header
  doc.roundedRect(M, cardY, cardW, 36, 8).fill(leftCard.headerBg || '#e2e8f0');
  doc.rect(M, cardY + 26, cardW, 10).fill(leftCard.headerBg || '#e2e8f0');
  doc.fontSize(13).font('Helvetica-Bold').fillColor(leftCard.headerColor || COLORS.textPrimary);
  doc.text(leftCard.title, M + 16, cardY + 11, { width: cardW - 32 });

  // Left Card Content
  let leftY = cardY + 50;
  leftCard.points.forEach((pt) => {
    doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.primaryDark);
    doc.text(`• ${pt.label}: `, M + 16, leftY, { width: cardW - 32, continued: true });
    doc.font('Helvetica').fillColor(COLORS.textSecondary);
    doc.text(pt.text, { lineGap: 3 });
    leftY += (pt.spacing || 56);
  });

  // Right Card
  const rightX = M + cardW + 18;
  doc.roundedRect(rightX, cardY, cardW, cardH, 8).fillAndStroke(COLORS.cardBg, COLORS.cardBorder);
  // Right Card Header
  doc.roundedRect(rightX, cardY, cardW, 36, 8).fill(rightCard.headerBg || '#e2e8f0');
  doc.rect(rightX, cardY + 26, cardW, 10).fill(rightCard.headerBg || '#e2e8f0');
  doc.fontSize(13).font('Helvetica-Bold').fillColor(rightCard.headerColor || COLORS.textPrimary);
  doc.text(rightCard.title, rightX + 16, cardY + 11, { width: cardW - 32 });

  // Right Card Content
  let rightY = cardY + 50;
  rightCard.points.forEach((pt) => {
    doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.primaryDark);
    doc.text(`• ${pt.label}: `, rightX + 16, rightY, { width: cardW - 32, continued: true });
    doc.font('Helvetica').fillColor(COLORS.textSecondary);
    doc.text(pt.text, { lineGap: 3 });
    rightY += (pt.spacing || 56);
  });
}

// ==================== CLEAN SLIDE DATA (NO VIVA BOXES) ====================
const slides = [
  // SLIDE 1: Title & Team Overview
  {
    type: 'title',
    title: 'GATHERLY - EVENT & TICKET MANAGEMENT PLATFORM',
    subtitle: 'Mini Project Presentation | Computer Science & Engineering',
    team: [
      { role: 'Member 1: Full-Stack Architect & Backend Lead', name: 'Member 1', focus: 'Next.js 16 App Router, JWT Authentication, REST APIs, Security Guards' },
      { role: 'Member 2: Frontend Lead & UI/UX Developer', name: 'Member 2', focus: 'React 19, Tailwind CSS v4, Multi-Category Discovery, Organizer Dashboard' },
      { role: 'Member 3: Database & ORM Engineer', name: 'Member 3', focus: 'PostgreSQL Relational Schema, Drizzle ORM, Concurrency & Inventory Control, DB Seeding' },
      { role: 'Member 4: Payment, Ticketing & DevOps Engineer', name: 'Member 4', focus: 'Stripe Checkout API, PDFKit E-Tickets, QR Codes, Testing & Vercel Deployment' }
    ]
  },

  // ---------------- MEMBER 1 (Slides 2-5) ----------------
  {
    role: 'Member 1: Backend & Full-Stack Architect',
    title: 'Slide 1 (M1): System Architecture & Tech Stack',
    left: {
      title: 'Full-Stack Architecture Overview',
      headerBg: '#dbeafe',
      headerColor: '#1e40af',
      points: [
        { label: 'Next.js 16 Framework', text: 'App Router architecture with React 19 providing a unified full-stack codebase.', spacing: 52 },
        { label: 'Server & Client Boundary', text: 'Server components for fast data fetching and client components for interactive UI forms.', spacing: 52 },
        { label: 'Colocated API Routes', text: 'Backend REST API routes organized cleanly under src/app/api/, eliminating CORS issues.', spacing: 52 },
        { label: 'Turbopack Compiler', text: 'Ultra-fast build and bundling tool ensuring quick hot-reloads and optimized bundles.', spacing: 52 }
      ]
    },
    right: {
      title: 'Directory Layout & Request Pipeline',
      headerBg: '#e0e7ff',
      headerColor: '#3730a3',
      points: [
        { label: 'Request Flow', text: 'Browser Request -> Next.js Route Handler -> Auth Guard -> Drizzle ORM -> PostgreSQL.', spacing: 52 },
        { label: 'Modular Structure', text: 'Clean separation between src/app/ (routes), src/db/ (models), and src/lib/ (utilities).', spacing: 52 },
        { label: 'State Sync', text: 'Zustand client store synchronizes user authentication state via /api/auth/me.', spacing: 52 },
        { label: 'Edge Ready', text: 'Fully optimized for serverless edge deployment with low memory consumption.', spacing: 52 }
      ]
    }
  },
  {
    role: 'Member 1: Backend & Full-Stack Architect',
    title: 'Slide 2 (M1): Authentication & Role-Based Access Control',
    left: {
      title: 'User Authentication Pipeline',
      headerBg: '#dbeafe',
      headerColor: '#1e40af',
      points: [
        { label: 'Role-Based Access (RBAC)', text: 'Strict database separation between "organizer" (event host) and "attendee" (ticket buyer).', spacing: 52 },
        { label: 'Password Encryption', text: 'Passwords securely hashed using bcryptjs with 10 salt rounds before database storage.', spacing: 52 },
        { label: 'Stateless JWT Tokens', text: 'Tamper-proof tokens signed with private secret key containing user ID, email, and role.', spacing: 52 },
        { label: 'Environment Security', text: 'JWT_SECRET and credentials stored safely in environment variables, never in source code.', spacing: 52 }
      ]
    },
    right: {
      title: 'Session & Cookie Security Strategy',
      headerBg: '#e0e7ff',
      headerColor: '#3730a3',
      points: [
        { label: 'httpOnly Cookie Storage', text: 'JWT tokens stored in httpOnly cookies, completely blocking Cross-Site Scripting (XSS) access.', spacing: 52 },
        { label: 'SameSite Flag Protection', text: 'Configured with SameSite: Lax to safeguard against Cross-Site Request Forgery (CSRF).', spacing: 52 },
        { label: '7-Day Session Validity', text: 'Sessions auto-expire after 7 days; logout immediately clears the cookie header.', spacing: 52 },
        { label: 'Auth Guard Helper', text: 'src/lib/auth.ts decodes and verifies session tokens on all protected routes.', spacing: 52 }
      ]
    }
  },
  {
    role: 'Member 1: Backend & Full-Stack Architect',
    title: 'Slide 3 (M1): API Route Design & Server-Side Security',
    left: {
      title: 'RESTful API Endpoint Structure',
      headerBg: '#dbeafe',
      headerColor: '#1e40af',
      points: [
        { label: 'Authentication APIs', text: '/api/auth/register, /api/auth/login, /api/auth/logout, and /api/auth/me.', spacing: 52 },
        { label: 'Events Catalog APIs', text: 'GET /api/events for category & keyword filtering; POST /api/events to create shows.', spacing: 52 },
        { label: 'Event Management APIs', text: 'GET, PUT, and DELETE /api/events/[id] for managing specific event details.', spacing: 52 },
        { label: 'Ticketing APIs', text: '/api/bookings for user history and /api/checkout for Stripe session generation.', spacing: 52 }
      ]
    },
    right: {
      title: 'Route Authorization & Error Handling',
      headerBg: '#e0e7ff',
      headerColor: '#3730a3',
      points: [
        { label: 'Ownership Verification', text: 'Verifies event.organizerId === user.id before allowing update or delete operations.', spacing: 52 },
        { label: 'Role Permission Guards', text: 'Blocks attendees from accessing organizer management endpoints with HTTP 403 Forbidden.', spacing: 52 },
        { label: 'Consistent HTTP Codes', text: 'Standard status codes: 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Server Error.', spacing: 52 },
        { label: 'Input Validation', text: 'Validates that show dates are in the future and ticket prices are valid positive numbers.', spacing: 52 }
      ]
    }
  },
  {
    role: 'Member 1: Backend & Full-Stack Architect',
    title: 'Slide 4 (M1): Challenges Overcome & Deliverables',
    left: {
      title: 'Technical Challenges Solved',
      headerBg: '#dbeafe',
      headerColor: '#1e40af',
      points: [
        { label: 'Challenge: State Hydration', text: 'Synchronizing client-side Zustand store with server httpOnly session cookies.', spacing: 52 },
        { label: 'Solution Implemented', text: 'Built /api/auth/me route to safely verify and bootstrap user session on layout mount.', spacing: 52 },
        { label: 'Challenge: Cookie Headers', text: 'Handling asynchronous cookie mutation headers in Next.js 16 route handlers.', spacing: 52 },
        { label: 'Solution Implemented', text: 'Leveraged Next.js cookies() API to set and clear serialized response headers safely.', spacing: 52 }
      ]
    },
    right: {
      title: 'Key Architectural Deliverables',
      headerBg: '#e0e7ff',
      headerColor: '#3730a3',
      points: [
        { label: 'Modular Controller Design', text: 'Clean, isolated API route handlers with reusable database and authentication helpers.', spacing: 52 },
        { label: 'Defense in Depth', text: 'Validation enforced on both client forms and server routes for absolute security.', spacing: 52 },
        { label: 'Stateless Scalability', text: 'JWT architecture avoids heavy session tables, enabling fast serverless execution.', spacing: 52 },
        { label: 'Team Coordination', text: 'Established clean JSON response formats so frontend and database could work in parallel.', spacing: 52 }
      ]
    }
  },

  // ---------------- MEMBER 2 (Slides 6-9) ----------------
  {
    role: 'Member 2: Frontend Lead & UI/UX Developer',
    title: 'Slide 1 (M2): Design System & User Interface Architecture',
    left: {
      title: 'UI Design System & Aesthetics',
      headerBg: '#fce7f3',
      headerColor: '#9d174d',
      points: [
        { label: 'Ticketing Platform Theme', text: 'Clean, modern visual design inspired by BookMyShow and Eventbrite.', spacing: 52 },
        { label: 'Curated Dark Palette', text: 'Slate canvas (#0F172A), card surfaces (#1E293B), and vibrant indigo accents (#6366F1).', spacing: 52 },
        { label: 'Modern Typography', text: 'Clean Inter font hierarchy with high contrast and legible body text.', spacing: 52 },
        { label: 'Vector Iconography', text: 'Integrated Lucide Icons for intuitive visual elements (Calendar, MapPin, Tag, User, Search).', spacing: 52 }
      ]
    },
    right: {
      title: 'Component Library & Responsive Layout',
      headerBg: '#fbcfe8',
      headerColor: '#831843',
      points: [
        { label: 'Tailwind CSS v4', text: 'High-performance utility-first styling with zero runtime CSS overhead.', spacing: 52 },
        { label: 'Modular UI Components', text: 'Reusable components: Navbar, EventCard, CategoryFilter, HeroBanner, CapacityBar.', spacing: 52 },
        { label: 'Responsive Grid Layout', text: 'Fluid layouts adapting smoothly from 4-columns on desktop to 1-column on mobile.', spacing: 52 },
        { label: 'Micro-Interactions', text: 'Smooth card hover lifts, animated tab pill indicators, and toast feedback alerts.', spacing: 52 }
      ]
    }
  },
  {
    role: 'Member 2: Frontend Lead & UI/UX Developer',
    title: 'Slide 2 (M2): Multi-Category Discovery & Real-Time Filtering',
    left: {
      title: 'Multi-Category Event Catalog',
      headerBg: '#fce7f3',
      headerColor: '#9d174d',
      points: [
        { label: '6 Event Categories', text: 'Quick filter tabs: Movies, Stream, Events, Plays, Sports, and Activities.', spacing: 52 },
        { label: 'Active Category Badges', text: 'Highlighted pill tabs with animated active indicators for clear user context.', spacing: 52 },
        { label: 'Rich Event Cards', text: 'Displays event poster image, title, category, date badge, venue, and price.', spacing: 52 },
        { label: 'Friendly Empty States', text: 'Clean fallback illustrations and messages when no shows match the filter criteria.', spacing: 52 }
      ]
    },
    right: {
      title: 'Instant Search & URL Synchronization',
      headerBg: '#fbcfe8',
      headerColor: '#831843',
      points: [
        { label: 'Real-Time Search Bar', text: 'Instant client-side debounced search matching title, venue location, and keywords.', spacing: 52 },
        { label: 'Date Filter Picker', text: 'Enables users to discover upcoming events happening today, this weekend, or next month.', spacing: 52 },
        { label: 'URL Query Sync', text: 'Search and category selections sync to URL (?category=sports&q=...) for bookmarking.', spacing: 52 },
        { label: 'Framer Motion Transitions', text: 'Smooth layout animations as event cards reorder and filter dynamically.', spacing: 52 }
      ]
    }
  },
  {
    role: 'Member 2: Frontend Lead & UI/UX Developer',
    title: 'Slide 3 (M2): Organizer Dashboard & Attendee Ticket Portals',
    left: {
      title: 'Organizer Management Dashboard',
      headerBg: '#fce7f3',
      headerColor: '#9d174d',
      points: [
        { label: 'Live Metrics Cards', text: 'Counters for Total Events Hosted, Tickets Sold, and Total Revenue generated.', spacing: 52 },
        { label: 'Capacity Progress Bars', text: 'Visual progress bar comparing tickets remaining vs total capacity with color thresholds.', spacing: 52 },
        { label: 'List Your Show Modal', text: 'Interactive modal form with validation for title, category, date-time, and poster URL.', spacing: 52 },
        { label: 'Show Management Actions', text: 'Quick action triggers to edit event details or delete expired listings.', spacing: 52 }
      ]
    },
    right: {
      title: 'Attendee "My Tickets" Portal',
      headerBg: '#fbcfe8',
      headerColor: '#831843',
      points: [
        { label: 'Booking History Cards', text: 'Chronological timeline of all booked tickets with unique booking references.', spacing: 52 },
        { label: 'Ticket Status Indicators', text: 'Clear status badges: "Confirmed", "Upcoming", or "Completed".', spacing: 52 },
        { label: 'Pass Download Triggers', text: 'Single-click buttons to download official PDF tickets directly to device.', spacing: 52 },
        { label: 'Gate QR Code Modal', text: 'Popup modal displaying high-resolution scannable QR code for entry verification.', spacing: 52 }
      ]
    }
  },
  {
    role: 'Member 2: Frontend Lead & UI/UX Developer',
    title: 'Slide 4 (M2): Frontend Challenges & Deliverables',
    left: {
      title: 'UI Engineering Challenges Solved',
      headerBg: '#fce7f3',
      headerColor: '#9d174d',
      points: [
        { label: 'Challenge: Hydration Mismatch', text: 'React 19 date formatting discrepancies between server and client locales.', spacing: 52 },
        { label: 'Solution Implemented', text: 'Created a standardized formatDate() helper and wrapped localized UI in mount guards.', spacing: 52 },
        { label: 'Challenge: Layout Shifts (CLS)', text: 'Layout jumping when external event poster images load asynchronously.', spacing: 52 },
        { label: 'Solution Implemented', text: 'Applied fixed aspect-ratio containers with shimmer skeleton loaders.', spacing: 52 }
      ]
    },
    right: {
      title: 'Key Frontend Deliverables',
      headerBg: '#fbcfe8',
      headerColor: '#831843',
      points: [
        { label: 'Semantic HTML5 Structure', text: 'Strict semantic elements (<header>, <nav>, <main>, <article>) for accessibility.', spacing: 52 },
        { label: 'Zustand State Store', text: 'Lightweight global store for auth and cart states without unnecessary re-renders.', spacing: 52 },
        { label: '1-Click Demo Buttons', text: 'Quick demo login shortcuts on sign-in page for instant live presentation review.', spacing: 52 },
        { label: 'Cross-Device Usability', text: 'Fully verified on mobile screens, laptops, and desktop browsers.', spacing: 52 }
      ]
    }
  },

  // ---------------- MEMBER 3 (Slides 10-13) ----------------
  {
    role: 'Member 3: Database & ORM Engineer',
    title: 'Slide 1 (M3): Relational Schema Design & Entity Relations',
    left: {
      title: 'PostgreSQL Tables (src/db/schema.ts)',
      headerBg: '#dcfce7',
      headerColor: '#166534',
      points: [
        { label: 'users Table', text: 'id (PK), name, email (unique), passwordHash, role (attendee/organizer), createdAt.', spacing: 52 },
        { label: 'events Table', text: 'id (PK), title, description, category, location, startsAt, endsAt, ticketPriceCents, capacity, ticketsRemaining, organizerId (FK).', spacing: 58 },
        { label: 'bookings Table', text: 'id (PK), reference (unique hash), eventId (FK), userId (FK), stripeSessionId (unique), quantity, totalCents, status, createdAt.', spacing: 58 }
      ]
    },
    right: {
      title: 'Referential Integrity & Constraints',
      headerBg: '#bbf7d0',
      headerColor: '#14532d',
      points: [
        { label: 'Foreign Key Relations', text: 'events.organizerId -> users.id; bookings.eventId -> events.id; bookings.userId -> users.id.', spacing: 52 },
        { label: 'Cascade Deletes', text: 'onDelete: "cascade" ensures child events and bookings clean up if user is removed.', spacing: 52 },
        { label: 'Unique Constraints', text: 'Guarantees unique emails, booking reference hashes, and Stripe session IDs.', spacing: 52 },
        { label: 'ACID Guarantees', text: 'Full transactional consistency prevents corrupted booking or financial records.', spacing: 52 }
      ]
    }
  },
  {
    role: 'Member 3: Database & ORM Engineer',
    title: 'Slide 2 (M3): Drizzle ORM Integration & Type Safety',
    left: {
      title: 'Advantages of Drizzle ORM',
      headerBg: '#dcfce7',
      headerColor: '#166534',
      points: [
        { label: 'Zero Runtime Overhead', text: 'Lightweight TypeScript SQL dialect library without bulky engine binaries.', spacing: 52 },
        { label: 'SQL-Like Syntax', text: 'Clean and transparent queries: db.select().from(events).where(eq(events.id, id)).', spacing: 52 },
        { label: 'Automatic Type Inference', text: 'Generates TypeScript types (User, Event, Booking) directly from table definitions.', spacing: 52 },
        { label: 'Serverless Optimization', text: 'Minimal bundle size allows near-instant cold start times on cloud serverless.', spacing: 52 }
      ]
    },
    right: {
      title: 'Migrations & Connection Pooling',
      headerBg: '#bbf7d0',
      headerColor: '#14532d',
      points: [
        { label: 'Drizzle Kit Push', text: 'npm run db:push syncs schema changes directly to PostgreSQL in seconds.', spacing: 52 },
        { label: 'Connection Pooling', text: 'Configured native pg.Pool in src/db/index.ts to handle concurrent database requests.', spacing: 52 },
        { label: 'SSL Compatibility', text: 'Configured SSL connections for cloud-hosted Neon Serverless PostgreSQL.', spacing: 52 },
        { label: 'Compile-Time Safety', text: 'Catches column misspellings and type errors during build instead of runtime.', spacing: 52 }
      ]
    }
  },
  {
    role: 'Member 3: Database & ORM Engineer',
    title: 'Slide 3 (M3): Inventory Concurrency & Data Integrity',
    left: {
      title: 'Overselling Prevention & Concurrency',
      headerBg: '#dcfce7',
      headerColor: '#166534',
      points: [
        { label: 'Real-Time Inventory State', text: 'Every show tracks original capacity alongside dynamic ticketsRemaining counter.', spacing: 52 },
        { label: 'Atomic Ticket Decrement', text: 'Tickets decremented atomically in SQL upon confirmed checkout payment.', spacing: 52 },
        { label: 'Conditional SQL Updates', text: 'UPDATE events SET ticketsRemaining = ticketsRemaining - N WHERE id = X AND ticketsRemaining >= N.', spacing: 58 },
        { label: 'Automatic Rollback', text: 'If remaining tickets < requested quantity, 0 rows update and booking fails safely.', spacing: 52 }
      ]
    },
    right: {
      title: 'Indexing & Session Deduplication',
      headerBg: '#bbf7d0',
      headerColor: '#14532d',
      points: [
        { label: 'Unique Indexing', text: 'uniqueIndex("bookings_session_idx").on(table.stripeSessionId) in schema.', spacing: 52 },
        { label: 'Idempotency Protection', text: 'Prevents duplicate ticket allocation if user refreshes the success callback URL.', spacing: 52 },
        { label: 'Cryptographic References', text: 'Unique 12-char randomized booking reference prevents ticket forgery.', spacing: 52 },
        { label: 'Foreign Key Indexing', text: 'Indices ensure rapid query joins when retrieving user booking history.', spacing: 52 }
      ]
    }
  },
  {
    role: 'Member 3: Database & ORM Engineer',
    title: 'Slide 4 (M3): Challenges Overcome & Database Seeding',
    left: {
      title: 'Database Challenges Solved',
      headerBg: '#dcfce7',
      headerColor: '#166534',
      points: [
        { label: 'Challenge: Price Precision', text: 'Floating-point calculation rounding discrepancies in currencies.', spacing: 52 },
        { label: 'Solution Implemented', text: 'Stored all prices as integers in cents (ticketPriceCents, totalCents) as fintech standard.', spacing: 52 },
        { label: 'Challenge: Timezones', text: 'Timezone discrepancies between venue local time and UTC database timestamps.', spacing: 52 },
        { label: 'Solution Implemented', text: 'Stored timestamps in standard UTC and formatted to local timezone on the client.', spacing: 52 }
      ]
    },
    right: {
      title: 'Database Seeding & Deliverables',
      headerBg: '#bbf7d0',
      headerColor: '#14532d',
      points: [
        { label: 'Automated Seed Script', text: 'src/db/seed.ts restores complete presentation demo data with npm run db:seed.', spacing: 52 },
        { label: 'Pre-Seeded Demo Accounts', text: 'Pre-configures organizer@demo.com and attendee@demo.com for instant testing.', spacing: 52 },
        { label: '10+ Multi-Category Shows', text: 'Populates realistic demo events across cinema, concerts, sports, and plays.', spacing: 52 },
        { label: 'Zero Migration Drift', text: 'Drizzle Kit keeps local development and production cloud schemas completely in sync.', spacing: 52 }
      ]
    }
  },

  // ---------------- MEMBER 4 (Slides 14-17) ----------------
  {
    role: 'Member 4: Payment, Ticketing & DevOps Engineer',
    title: 'Slide 1 (M4): Stripe Payment Gateway Integration',
    left: {
      title: 'Stripe Checkout Lifecycle',
      headerBg: '#fef3c7',
      headerColor: '#92400e',
      points: [
        { label: 'Checkout Session Creation', text: 'Server initiates stripe.checkout.sessions.create() with items, price, and currency.', spacing: 52 },
        { label: 'Secure Hosted Checkout', text: 'User redirected to official Stripe-hosted payment form; card details entered securely.', spacing: 52 },
        { label: 'Success Callback Route', text: 'Redirects to /checkout/success?session_id={CHECKOUT_SESSION_ID} on payment completion.', spacing: 52 },
        { label: 'Cancellation Callback', text: 'Redirects to /checkout/cancel if dismissed, releasing cart without phantom booking.', spacing: 52 }
      ]
    },
    right: {
      title: 'Server Verification & PCI Compliance',
      headerBg: '#fde68a',
      headerColor: '#78350f',
      points: [
        { label: 'Direct Server Verification', text: 'Server queries Stripe API directly to verify session.payment_status === "paid".', spacing: 52 },
        { label: 'Full PCI-DSS Compliance', text: 'Credit card numbers never touch our servers; 100% processed by Stripe infrastructure.', spacing: 52 },
        { label: 'Test Mode Sandbox', text: 'Configured STRIPE_SECRET_KEY in test mode using official test card numbers (4242...).', spacing: 52 },
        { label: 'Session Metadata', text: 'Passes eventId, userId, and ticket quantity in Stripe session metadata for reconciliation.', spacing: 52 }
      ]
    }
  },
  {
    role: 'Member 4: Payment, Ticketing & DevOps Engineer',
    title: 'Slide 2 (M4): Programmatic PDF Ticket Generation (PDFKit)',
    left: {
      title: 'PDFKit Vector Generation Engine',
      headerBg: '#fef3c7',
      headerColor: '#92400e',
      points: [
        { label: 'Server-Side Vector Engine', text: 'PDFKit generates vector PDF documents entirely in Node.js server environment.', spacing: 52 },
        { label: 'Official Ticket Layout', text: 'Standard A4 format with purple "Evently E-Ticket" banner and booking reference.', spacing: 52 },
        { label: 'Event Details Card', text: 'Includes formatted event title, venue address, show start time, and ticket count.', spacing: 52 },
        { label: 'Attendee Identity Block', text: 'Prints attendee full name and registered email for identity validation at venue.', spacing: 52 }
      ]
    },
    right: {
      title: 'In-Memory Buffering & Binary Streaming',
      headerBg: '#fde68a',
      headerColor: '#78350f',
      points: [
        { label: 'Embedded QR Code Buffer', text: 'Embeds dynamically generated QR PNG buffer directly using doc.image(qrBuffer).', spacing: 52 },
        { label: 'In-Memory Chunk Buffer', text: 'Collects PDF chunks into Buffer.concat() with zero temporary files written to disk.', spacing: 52 },
        { label: 'Instant Download Response', text: 'Streams binary response with Content-Type: application/pdf for 1-click download.', spacing: 52 },
        { label: 'Printable Pass Format', text: 'Clean vector design suitable for both smartphone screens and paper printouts.', spacing: 52 }
      ]
    }
  },
  {
    role: 'Member 4: Payment, Ticketing & DevOps Engineer',
    title: 'Slide 3 (M4): Scannable QR Codes & Email Delivery',
    left: {
      title: 'QR Code Generation & Gate Security',
      headerBg: '#fef3c7',
      headerColor: '#92400e',
      points: [
        { label: 'QR Code Generator', text: 'qrcode package in src/lib/qr.ts converts booking reference to high-res PNG buffers.', spacing: 52 },
        { label: 'Cryptographic Reference', text: 'Encodes unique 64-character booking reference hash for instantaneous lookup.', spacing: 52 },
        { label: 'Gate Camera Validation', text: 'Event staff can scan QR with mobile camera to instantly verify ticket legitimacy.', spacing: 52 },
        { label: 'Anti-Counterfeiting', text: 'Impossible to forge because reference must match an active confirmed database record.', spacing: 52 }
      ]
    },
    right: {
      title: 'Automated Email Confirmation (Nodemailer)',
      headerBg: '#fde68a',
      headerColor: '#78350f',
      points: [
        { label: 'Nodemailer Pipeline', text: 'Configured in src/lib/email.ts for automated transactional emails upon payment.', spacing: 52 },
        { label: 'HTML Receipt Delivery', text: 'Dispatches confirmation email with venue address, date, and booking reference.', spacing: 52 },
        { label: 'Asynchronous Dispatch', text: 'Dispatched in background so UI checkout success redirect remains instant.', spacing: 52 },
        { label: 'Resilient Access', text: 'If email delivery fails, tickets remain 100% accessible via My Tickets portal.', spacing: 52 }
      ]
    }
  },
  {
    role: 'Member 4: Payment, Ticketing & DevOps Engineer',
    title: 'Slide 4 (M4): Testing, Cloud Deployment & Future Scope',
    left: {
      title: 'Testing & Quality Assurance',
      headerBg: '#fef3c7',
      headerColor: '#92400e',
      points: [
        { label: 'Postman API Test Suites', text: 'Constructed API test suites validating status codes (200, 400, 401, 403, 404).', spacing: 52 },
        { label: 'Boundary Edge Cases', text: 'Verified that zero-ticket bookings and unauthorized organizer actions are rejected.', spacing: 52 },
        { label: 'Strict TypeScript 5.9', text: 'npm run typecheck verifies zero runtime undefined or type mismatch errors.', spacing: 52 },
        { label: 'ESLint 9 Code Hygiene', text: 'Enforces clean code conventions, hook dependencies, and unused variable cleanup.', spacing: 52 }
      ]
    },
    right: {
      title: 'Cloud Deployment & Future Scope',
      headerBg: '#fde68a',
      headerColor: '#78350f',
      points: [
        { label: 'Vercel Serverless Hosting', text: 'Automated CI/CD deployment on every Git push; serverless API functions scale automatically.', spacing: 52 },
        { label: 'Neon Serverless PostgreSQL', text: 'Cloud PostgreSQL database with encrypted SSL connection pooling (sslmode=require).', spacing: 52 },
        { label: 'Encrypted Secrets', text: 'DATABASE_URL, JWT_SECRET, STRIPE_SECRET_KEY stored securely in Vercel settings.', spacing: 52 },
        { label: 'Future Enhancements', text: 'Interactive SVG seat selection matrix, organizer revenue analytics, and WhatsApp alerts.', spacing: 52 }
      ]
    }
  },

  // SLIDE 18: Summary Matrix (4 Members)
  {
    type: 'summary',
    title: 'TEAM RESPONSIBILITY & MODULE MATRIX',
    subtitle: 'Summary of Roles and Deliverables Across the 4 Team Members'
  }
];

// ==================== GENERATE SLIDES ====================

const TOTAL_SLIDES = slides.length; // 18

slides.forEach((slide, index) => {
  const slideNum = index + 1;
  doc.addPage();

  if (slide.type === 'title') {
    // ---------------- TITLE SLIDE ----------------
    doc.rect(M, M, CONTENT_W, PAGE_H - (M * 2)).fillAndStroke('#0f172a', '#1e293b');
    
    // College Project Pill
    doc.roundedRect(M + 30, M + 30, 260, 22, 4).fill('#1e293b');
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#38bdf8');
    doc.text('ACADEMIC MINI PROJECT PRESENTATION', M + 40, M + 36);

    // Title
    doc.fontSize(28).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('GATHERLY : EVENT & TICKET MANAGEMENT', M + 30, M + 65, { width: CONTENT_W - 60 });

    // Subtitle
    doc.fontSize(13).font('Helvetica').fillColor('#94a3b8');
    doc.text('A Full-Stack Event Discovery, Booking & Automated Ticketing Platform Built with Next.js 16, PostgreSQL & Stripe', M + 30, M + 105, { width: CONTENT_W - 60 });

    // Separator line
    doc.moveTo(M + 30, M + 135).lineTo(PAGE_W - M - 30, M + 135).strokeColor('#334155').lineWidth(1.5).stroke();

    // Team Roles Grid (4 Members)
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#38bdf8');
    doc.text('4 TEAM MEMBERS & MODULAR ROLE DISTRIBUTION (4 SLIDES PER MEMBER):', M + 30, M + 155);

    const teamBoxY = M + 185;
    const boxW = CONTENT_W - 60;
    const rowH = 68;

    slide.team.forEach((member, mIdx) => {
      const rowY = teamBoxY + (mIdx * (rowH + 12));
      doc.roundedRect(M + 30, rowY, boxW, rowH, 6).fillAndStroke('#1e293b', '#334155');

      // Left Accent Strip
      const accents = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b'];
      doc.roundedRect(M + 30, rowY, 6, rowH, 2).fill(accents[mIdx]);

      // Role Title
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text(member.role, M + 50, rowY + 12);

      // Student Assigned Tag
      doc.fontSize(11).font('Helvetica-Bold').fillColor(accents[mIdx]);
      doc.text(`[ ${member.name} ]`, M + 470, rowY + 12);

      // Focus Areas
      doc.fontSize(10.5).font('Helvetica').fillColor('#cbd5e1');
      doc.text(`Key Modules: ${member.focus}`, M + 50, rowY + 36, { width: boxW - 50 });
    });

    // Bottom Footer in Title Slide
    doc.fontSize(9.5).font('Helvetica-Oblique').fillColor('#64748b');
    doc.text('Department of Computer Science & Engineering | Mini Project Evaluation', M + 30, PAGE_H - M - 25);

  } else if (slide.type === 'summary') {
    // ---------------- SUMMARY MATRIX SLIDE (4 MEMBERS) ----------------
    drawHeader(doc, slideNum, TOTAL_SLIDES, 'Project Summary', slide.title);

    const tableY = M + 80;
    const colW = [145, 115, 230, 250];
    const headerH = 32;
    const rowH = 88;

    // Table Header
    doc.rect(M, tableY, CONTENT_W, headerH).fill('#1e293b');
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#ffffff');
    let hX = M + 10;
    const headers = ['Role / Member', 'Tech Stack', 'Core Deliverables', 'Key Codebase Files'];
    headers.forEach((h, hIdx) => {
      doc.text(h, hX, tableY + 10, { width: colW[hIdx] - 12 });
      hX += colW[hIdx];
    });

    // Rows (4 Members)
    const matrix = [
      { role: 'Member 1\nBackend Lead', tech: 'Next.js 16 App Router,\nJWT, bcryptjs', del: 'Full-stack architecture, REST API route hierarchy, RBAC authorization guards, httpOnly secure cookies', files: 'src/app/api/*\nsrc/lib/auth.ts\nsrc/lib/jwt.ts' },
      { role: 'Member 2\nFrontend Lead', tech: 'React 19, Tailwind CSS v4,\nFramer Motion, Lucide', del: '6-category event discovery catalog, real-time search filters, organizer dashboard, attendee ticket portal', files: 'src/app/events/*\nsrc/components/*\nsrc/app/dashboard/*' },
      { role: 'Member 3\nDatabase Lead', tech: 'PostgreSQL,\nDrizzle ORM, Drizzle Kit', del: 'Relational schema design, cascade rules, atomic inventory decrements, concurrency control, database seeder', files: 'src/db/schema.ts\nsrc/db/index.ts\nsrc/db/seed.ts' },
      { role: 'Member 4\nPayment & DevOps', tech: 'Stripe API, PDFKit,\nQRCode, Vercel, Neon', del: 'Stripe checkout integration, programmatic PDF ticket generation, gate QR verification, Postman test suites, cloud deploy', files: 'src/lib/pdf.ts\nsrc/lib/qr.ts\nsrc/lib/stripe.ts' }
    ];

    matrix.forEach((row, rIdx) => {
      const rY = tableY + headerH + (rIdx * rowH);
      const bg = (rIdx % 2 === 0) ? '#f8fafc' : '#ffffff';
      doc.rect(M, rY, CONTENT_W, rowH).fillAndStroke(bg, '#cbd5e1');

      let colX = M + 10;
      const texts = [row.role, row.tech, row.del, row.files];
      texts.forEach((txt, cIdx) => {
        doc.fontSize(10.5).font(cIdx === 0 ? 'Helvetica-Bold' : 'Helvetica').fillColor(cIdx === 0 ? COLORS.primaryDark : COLORS.textPrimary);
        doc.text(txt, colX, rY + 12, { width: colW[cIdx] - 14, lineGap: 3 });
        colX += colW[cIdx];
      });
    });

    drawFooter(doc, slideNum, TOTAL_SLIDES);

  } else {
    // ---------------- STANDARD 2-CARD CONTENT SLIDE ----------------
    drawHeader(doc, slideNum, TOTAL_SLIDES, slide.role, slide.title);
    drawTwoCards(doc, slide.left, slide.right);
    drawFooter(doc, slideNum, TOTAL_SLIDES);
  }
});

doc.end();

writeStream.on('finish', () => {
  console.log(`Successfully generated clean 4-member presentation PDF: ${outputPath}`);
});
