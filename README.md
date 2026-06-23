# ToqueTop / C’est ma table

Production-ready MVP foundation for restaurant booking and table operations.

## Stack

- Next.js App Router, TypeScript, TailwindCSS
- React Query for server state, Zustand for local booking/floor state
- Next.js API routes as the MVP backend boundary
- PostgreSQL with Prisma ORM
- NextAuth credentials auth with role-based access
- Socket.io realtime events through a custom Next server
- Resend email helpers
- Brevo SMS helpers
- AWS S3 image upload helper

## Core Architecture

```text
src/app/api                API route controllers
src/server/services        Domain services and business rules
src/server/realtime.ts     Socket.io event bridge
src/server/email.ts        Reservation email templates
src/server/sms.ts          Transactional SMS helpers
src/server/storage/s3.ts   S3 image upload/delete helpers
src/components             Client and admin interfaces
src/components/dashboard   Dashboard Live V1 restaurant admin
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
npx prisma migrate dev --name dashboard_live_v1
npx prisma db seed
```

The legacy shortcut is still available:

```bash
npm run db:seed
```

5. Run the app with Socket.io:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Required Commands

```bash
npm run dev
npm run build
npm run test
npm run test:e2e
npx prisma migrate dev --name dashboard_live_v1
npx prisma db seed
```

## Seed Accounts

- Admin: `admin@smartable.local` / `password123`
- Client: `client@smartable.local` / `password123`

## Dashboard Live V1

The restaurant admin dashboard is available at `/admin`.

Implemented V1 scope:

- Fixed header with ToqueTop branding, Dashboard Live title, and restaurant identity.
- Collapsible sidebar with the requested sections: setup guide, general, reservations, CRM, services, gallery, gift cards, team, notifications, integrations, subscription, statistics.
- General submenu cards for restaurant, opening hours, tables and rooms, reservation settings, tags, reservation types, connections, advanced.
- Live floor plan centered on the existing 2D/3D floor plan component.
- Existing interactions preserved: table selection, drag/drop, zoom, 2D/3D switching, table status labels, realtime refresh.
- Reservation views: list, calendar-style cards, timeline bars.
- Quick actions: create reservation, edit reservation, cancel reservation, assign selected table, block selected table, mark guest arrived, contact guest, add waitlist entry.
- CRM minimal: customer profile fields, VIP flag, no-show risk, allergies, preferences, internal notes, reservation history.
- Waitlist API and UI entry flow.
- Chef Toque V1: local rules engine for service occupancy, birthdays, no-show risk, table conflicts, peak/weak slots, waitlist pressure.
- Restaurant notification templates API for email/SMS templates with variables.
- Audit events API for admin actions.

## Realtime Contract

Socket.IO uses restaurant rooms named:

```text
restaurant:{id}
```

Supported V1 events:

```text
reservation_created
reservation_updated
reservation_cancelled
table_blocked
table_unblocked
plan_updated
client_updated
waitlist_updated
service_status_updated
```

Legacy events such as `reservation:created` and `layout:updated` are still emitted for backwards compatibility and mirrored to the V1 event names.

## Data Model Additions

Dashboard Live V1 adds:

- `Client`
- `WaitlistEntry`
- `AuditEvent`
- `NotificationTemplate`
- `RestaurantUser`

`Reservation` now supports:

- `clientId`
- `arrivedAt`
- `noShow`

These changes are additive and non-destructive.

## Testing

```bash
npm run test
npm run test:e2e
```

Current tests cover:

- Reservation overlap logic.
- Reservation, client, waitlist and template validators.
- Contract-level create/update/cancel reservation flow.

## Manual QA Checklist

1. Sign in as `admin@smartable.local`.
2. Open `/admin`.
3. Verify the fixed header, collapsible sidebar and Dashboard Live title.
4. Switch between 2D and 3D floor plan.
5. Drag a table on the 2D plan and confirm it persists after refresh.
6. Create a reservation from quick actions.
7. Select the reservation, assign a table, then mark the client as arrived.
8. Cancel a reservation and confirm realtime list refresh.
9. Select a table and create a block for a time range.
10. Add a waitlist entry.
11. Open CRM, search a client, and verify reservation history/no-show/VIP data.
12. Confirm Chef Toque displays recommendations for the selected date.
13. Confirm `/reservation` and restaurant subdomains still load public booking.
14. Confirm `/login` remains headerless/footerless and the visual stays fixed on desktop.

## Legacy Local Setup Alternative

If you are not using migrations during a quick prototype:

```bash
npm run db:push
npm run db:seed
```

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
