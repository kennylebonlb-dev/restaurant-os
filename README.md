# Restaurant OS

Production-ready MVP foundation for restaurant booking and table operations.

## Stack

- Next.js App Router, TypeScript, TailwindCSS
- React Query for server state, Zustand for local booking/floor state
- Next.js API routes as the MVP backend boundary
- PostgreSQL with Prisma ORM
- NextAuth credentials auth with role-based access
- Socket.io realtime events through a custom Next server
- Resend email helpers
- AWS S3 image upload helper

## Core Architecture

```text
src/app/api                API route controllers
src/server/services        Domain services and business rules
src/server/realtime.ts     Socket.io event bridge
src/server/email.ts        Reservation email templates
src/server/storage/s3.ts   S3 image upload/delete helpers
src/components             Client and admin interfaces
src/stores                 Zustand UI state
prisma/schema.prisma       PostgreSQL data model
```

The reservation engine lives in `src/server/services/reservation-service.ts`.
Availability uses the required overlap rule for reservations and blocks:

```ts
existing.startTime < requested.endTime && existing.endTime > requested.startTime
```

## Local Setup

1. Copy `.env.example` to `.env`.
2. Point `DATABASE_URL` at a PostgreSQL database. For local development with Docker:

```bash
npm run db:up
```
3. Install dependencies:

```bash
npm install
```

4. Prepare the database:

```bash
npm run db:push
npm run db:seed
```

5. Run the app with Socket.io:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Seed Accounts

- Admin: `admin@restaurant-os.local` / `password123`
- Client: `client@restaurant-os.local` / `password123`

## MVP Coverage

- Email/password auth
- Roles: `CLIENT`, `ADMIN`, `STAFF`
- Restaurant CRUD with opening hours and JSON settings
- Table CRUD with 2D position, rotation, zones, active state, and layout lock
- Reservation creation, cancellation, admin override, and personal reservation view
- Table blocks that prevent bookings
- Realtime invalidation for reservations, table changes, and blocks
- Confirmation and cancellation email templates
- Basic daily analytics: reservation count, reserved seats, occupancy rate

## Roadmap Hooks

- Phase 2 can expand the floor editor with snap-to-grid, zones, and image backgrounds.
- Phase 3 can replace or augment the 2D plan with Three.js while keeping table coordinates and reservation services intact.
- AI optimization can consume the same availability and occupancy services without rewriting booking validation.
