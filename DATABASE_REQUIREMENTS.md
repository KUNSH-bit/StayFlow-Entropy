# Database requirements

## Runtime

- PostgreSQL is required for application operations.
- Prisma ORM 7 uses `@prisma/adapter-pg` and `pg`; the generated client is under `server/src/generated/prisma`.
- Configure `DATABASE_URL` for the runtime database. It is loaded from the server environment and must never be committed.
- `GET /health` reports whether the URL is configured. `GET /health/ready` runs `SELECT 1` and reports connectivity without changing data.

## Models

| Area | Models | Purpose |
|---|---|---|
| Identity | `User`, `Session`, `HotelMembership`, `MembershipInvite` | Global account, hashed session token, hotel role, and expiring invitation |
| Hotel setup | `Hotel`, `RoomType`, `Room` | Tenant configuration, shared rate/capacity, and inventory |
| Reservations | `Guest`, `Booking`, `RoomReservation` | Tenant guest records, date-bounded bookings, and room assignments |
| Finance | `Invoice`, `Payment` | Booking folios and an append-only payment ledger; invoice balance is derived |
| Operations | `Employee`, `StaffSchedule`, `HousekeepingTask`, `GuestRequest` | Staff directory/shifts, room cleaning, and customer requests |
| Communication | `InboundEmail`, `OutboundEmail` | Imported message review and outbound delivery metadata; raw outbound message bodies are not stored |
| Calendar | `CalendarOAuthState`, `GoogleCalendarIntegration`, `CalendarEvent` | One-use OAuth state, encrypted Google tokens, and event mapping |

## Tenant integrity

Every operational record carries a `hotelId`. Composite unique keys and foreign keys bind rooms to same-hotel room types, bookings to same-hotel guests, room assignments to same-hotel rooms/bookings, and payments to same-hotel invoices. Application queries also filter by the authenticated user's hotel membership. The `X-Hotel-Id` request header is accepted only after the backend confirms that membership.

Unique constraints cover user email, hotel subdomain, hotel room number, room type name per hotel, guest email per hotel, employee email per hotel, user membership per hotel, invitation email per hotel, and booking/invoice relationships. Indexes support hotel/status/date lookups for reservations, rooms, payments, housekeeping, requests, schedules, sessions, and email records.

Booking creation uses a serializable transaction and rejects overlapping active reservations. The initial migration adds database checks for date order, positive guest counts/payment amounts, non-negative totals, valid room capacity/rates, and ordered shifts. API validation mirrors these constraints.

## Migrations and data safety

`server/prisma/migrations/20261031000000_initial/migration.sql` is generated from an empty PostgreSQL schema. It creates tables and constraints; it has **not** been applied to any database in this workspace. The configured local environment did not establish a disposable target or verified backup, so no migration or write test was run.

For a new empty development database, run:

```sh
cd server
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate:deploy
```

For an existing database, first create and verify a PostgreSQL backup, inspect existing tables and `prisma_migrations`, and plan a baseline or forward-only migration. Do not run `migrate dev`, reset, drop, or apply this initial migration to a database with existing data without that review.

Example backup command for a database owner to run before a planned migration:

```sh
pg_dump --format=custom --file=stayflow-before-migration.dump "$DATABASE_URL"
```

The dump must be stored securely and its restoration verified before any risky migration.

## Setup values

`server/.env.example` documents the local URL format. Production requires a managed PostgreSQL service, TLS, regular tested backups, migration review, and a least-privilege runtime role. The sample credentials are placeholders and are not valid database access.
