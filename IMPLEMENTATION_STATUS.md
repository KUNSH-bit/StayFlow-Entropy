# StayFlow implementation status

**State:** integrated application foundation and operating flows are implemented. The repository is not yet verified against a real database or external provider, so production deployment is blocked on environment setup and end-to-end database checks.

## Implemented

- React/Vite frontend and Express/TypeScript API use the same API contract and an HttpOnly session cookie.
- Owner registration, login/logout, server-side session expiry, hotel switching, expiring invitations, and membership role enforcement.
- PostgreSQL/Prisma schema, generated client, PostgreSQL driver adapter, tenant-bound composite relations/indexes, and an offline initial SQL migration.
- Room and room-type management, date-aware reservation conflict checks, guest records, reservation edit/cancel, check-in/out, folios, payment ledger, and balance reporting.
- Staff records and dated schedules, shift-overlap checks, housekeeping assignment/completion, guest requests, dashboard, daily occupancy and payment reports.
- Email text import, heuristic booking extraction for review, provider webhook routing by hotel inbound address, and SMTP outbound email.
- Google Calendar OAuth/token encryption/manual sync, private iCalendar feed, Indian public holidays, and a strictly read-only operational assistant.
- Central request validation/errors, allowlisted credentialed CORS, origin checks for writes, rate limits, security headers, and tenant-scoped backend queries.
- Project, API, database, setup, and remaining-work documentation.

## Verification completed

- Prisma schema validation — passed.
- Prisma Client generation — passed.
- Backend strict TypeScript check and production compilation — passed.
- Backend tests — 10 passed, 0 failed.
- Frontend TypeScript check — passed.
- Frontend Vite production build — passed on Vite 6.4.5.
- Local API liveness — `GET /health` returned 200.
- Browser/API check — production preview made a credentialed request from port 4173; CORS passed and the private rooms endpoint returned the expected 401 without a session.
- Frontend `npm audit` — 0 vulnerabilities.
- Server `npm audit` — 3 low-severity findings remain in `deepmerge`, pulled by `date-holidays-parser`. The available automatic fix downgrades `date-holidays` to an old, breaking 2020 release; current holiday data was retained. The prior high Nodemailer findings were fixed by upgrading to Nodemailer 10.3.1.

## Remaining blockers and unverified work

- **PostgreSQL:** the existing server environment does not establish a disposable development target or verified backup. The initial migration was generated from an empty schema but **not applied**; readiness/connectivity and data-backed integration tests were not run. Configure a known development database, preserve existing data, then migrate and test auth, tenant isolation, reservations, payments, and reports.
- **Google Calendar:** Google OAuth client ID/secret, registered callback, and persistent encryption key are required. OAuth and sync code are implemented but not tested against a Google account.
- **Email:** SMTP credentials and a provider/domain webhook configuration are required to send and receive actual messages. Local import/extraction is implemented; external delivery was not tested.
- **AI:** an OpenAI API key is required for model-backed answers. Without it, the local read-only operational answer path is available. The model path was not exercised without a credential.
- **Payment gateway and guest self-service:** payment collection is recorded after an external/offline transaction; there is no payment processor or guest login/portal. Staff manage guest reservations and requests.
- **Production operations:** configure HTTPS hostnames/CORS, production secret storage, PostgreSQL backup/restore drills, email verification/password recovery, monitoring, and deployment-specific policies before launch.

See [DATABASE_REQUIREMENTS.md](./DATABASE_REQUIREMENTS.md) for the safe migration procedure and [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for endpoint access rules.
