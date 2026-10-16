# Gatherly - Production Deployment & DevOps Guide

## 1. Production Architecture Overview

Gatherly is architected for zero-downtime, edge-accelerated deployments using **Next.js 16 (Turbopack)**, **PostgreSQL 16**, and stateless JWT authentication.

```text
[Cloudflare CDN / Vercel Edge]
          │
          ▼
   [Next.js App Server]
    ├── Server Components (SSR / ISR)
    ├── Edge API Route Handlers
    ├── Sliding Window Rate Limiter
    └── Dynamic PDF & Barcode Generation
          │
          ▼
   [PostgreSQL Database (Neon / Supabase / AWS RDS)]
```

---

## 2. Environment Variables Checklist

Ensure these variables are set in your production environment (Vercel, Railway, AWS ECS, or Docker):

| Variable | Required | Description |
|---|:---:|---|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string with SSL (`sslmode=require`) |
| `JWT_SECRET` | **Yes** | 32+ character random string for signing JWTs |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Production domain (e.g. `https://gatherly.events`) |
| `STRIPE_SECRET_KEY` | Optional | Stripe production API key (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Optional | Webhook verification signing secret |
| `SMTP_HOST` | Optional | SMTP mail provider (e.g. `smtp.resend.com`, `smtp.sendgrid.net`) |
| `SMTP_PORT` | Optional | `587` |
| `SMTP_USER` | Optional | SMTP username |
| `SMTP_PASS` | Optional | SMTP password |
| `EMAIL_FROM` | Optional | Sender address (e.g. `tickets@gatherly.events`) |

---

## 3. Database Migration Deployment Step

Before deploying new application containers, run the automated Drizzle schema migration:

```bash
# Push schema updates to production database
npm run db:push
```

---

## 4. Docker Containerization Guide

```dockerfile
# Multi-stage Dockerfile for Gatherly
FROM node:20-alpine AS base

# 1. Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2. Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 3. Production runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 5. Security & Verification Checklist

- [x] Run `npm run typecheck` (`tsc --noEmit`) to ensure zero type issues.
- [x] Run `npm test` to verify unit, security, and performance test suites.
- [x] Security headers active: `HSTS`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`.
- [x] Rate limiting active on sensitive endpoints (`/api/auth/*`, `/api/checkout/*`).
- [x] Double-booking prevention verified via atomic seat reservation locks.
