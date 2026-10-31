# StayFlow requirements

## Product

StayFlow supports hotel owners and staff across one or more hotel properties. Hotel data is isolated by membership and role. A hotel account is created during owner registration; staff can join by an expiring invitation.

## Functional requirements

- Register, sign in, restore a cookie-backed session, sign out, and expire sessions server-side.
- Create hotel workspaces, switch between authorized memberships, manage team access, and assign roles.
- Create rooms and shared room types, maintain nightly rate/capacity/status, and prevent booking conflicts.
- Create and update guest records and reservations; enforce date, room, and capacity rules; check guests in/out.
- Create booking folios, record offline payments, calculate balances, void unpaid folios when cancelled, and protect payment history.
- Maintain staff directory and dated schedules; reject overlapping shifts.
- Create and assign housekeeping tasks; create a cleaning task at checkout; mark the room inspected after all open tasks complete.
- Record customer service queries and update their work status.
- Import booking emails for extraction and staff review; require staff confirmation before a reservation is created. Send outbound messages through configured SMTP.
- Export bookings as a private iCalendar feed and optionally connect Google Calendar through OAuth and explicit sync.
- Report daily occupancy and payment revenue; show Indian public holidays.
- Answer operational questions through a read-only assistant. The assistant cannot change records, send messages, or execute tools.

## Security and data rules

- Every tenant-owned row is hotel-scoped in both queries and composite database relations.
- The backend resolves each hotel membership and role; browser-provided hotel IDs are only selectors and never authorities.
- Passwords use salted scrypt hashes. Session tokens are random, stored hashed, and delivered only in an HttpOnly cookie.
- Browser write requests require an allowed origin. CORS is credentialed and allowlisted; production origins and public URLs require HTTPS.
- Route inputs use Zod validation, request bodies have size limits, errors omit database details, and login/registration/assistant routes are rate limited.
- Google OAuth tokens are encrypted with AES-256-GCM. Email webhook authorization uses a separate shared secret and routes by the hotel's configured inbound address.
- The assistant receives no mutation tools. External model calls are optional and server-side only.

## External setup requirements

PostgreSQL is required for all hotel operations. Google OAuth, SMTP, an inbound email provider/domain, and an OpenAI API key are optional. Without those credentials, their corresponding external flows report that configuration is required; local iCalendar export, email text extraction, and rule-based assistant answers remain available.

## Known product boundaries

- Guest self-service accounts and a public booking portal are not enabled; staff manage guest operations.
- Payment processing is not integrated. Payments entered in StayFlow represent payments collected elsewhere.
- Staff schedules are hotel records, not linked to user authentication accounts unless the person separately accepts a hotel membership invitation.
- Email extraction is heuristic. Staff must review the extracted details and create or edit a booking explicitly.
