# StayFlow API

Base path: `/api`. JSON errors use `{ "error": { "code", "message", "details?", "requestId" } }`. Every API response includes `X-Request-Id`.

The frontend uses `credentials: include`. Authentication is a server-side session stored in PostgreSQL; the browser receives an `HttpOnly`, `SameSite=Lax` cookie named `stayflow_session` (Secure in production). The cookie contains a random token while only its SHA-256 hash is stored. Mutating requests from browsers must use an origin in `CORS_ORIGINS`.

Hotel operations accept an optional `X-Hotel-Id` header. The backend verifies that the signed-in user has a membership in that hotel and enforces the role server-side. A client-supplied hotel ID never grants access.

## Authentication and access

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/auth/register` | Public, rate limited | `{name,email,password,hotelName}` creates an owner/property; `{inviteToken}` joins the invited hotel instead |
| `POST` | `/auth/login` | Public, rate limited | `{email,password}`; sets session cookie |
| `GET` | `/auth/me` | Signed-in | User, hotel memberships, active hotel |
| `POST` | `/auth/logout` | Signed-in | Revoke current session and clear cookie |
| `POST` | `/auth/accept-invite` | Signed-in | `{token}` accepts an invitation addressed to the account email |
| `GET` | `/hotels` | Signed-in | Hotels available to the current account |
| `GET` | `/hotels/current` | Hotel member | Current hotel and role |
| `PATCH` | `/hotels/current` | Owner/manager | Update hotel name, currency, or IANA time zone |
| `GET` | `/hotels/memberships` | Owner/manager | List hotel users and roles |
| `POST` | `/hotels/invites` | Owner/manager | `{email,role}`; returns a one-time invite URL (share it with the teammate) |
| `PATCH` | `/hotels/memberships/:membershipId` | Owner/manager | Change a non-owner role |
| `DELETE` | `/hotels/memberships/:membershipId` | Owner/manager | Remove hotel access; protects the last owner |

Membership roles are `OWNER`, `MANAGER`, `FRONT_DESK`, `HOUSEKEEPING`, and `VIEWER`. Read routes require membership. Hotel, financial, booking, and staff writes are limited by role; owners/managers manage hotel roles, room types, staff, schedules, and Google Calendar.

## Dashboard, inventory, and reservations

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/dashboard` | Hotel member | Room counts, occupancy, arrivals/departures, revenue, balance, tasks, upcoming bookings |
| `GET` | `/rooms` | Hotel member | Hotel rooms and current status |
| `POST` | `/rooms` | Owner/manager/front desk | `{roomNumber,type,rate,maxCapacity,floor?}`; creates a shared room type if absent |
| `PATCH` | `/rooms/:roomId/status` | Owner/manager/front desk | `{status}` where status is `AVAILABLE`, `RESERVED`, `OCCUPIED`, `DIRTY`, `CLEANING`, `INSPECTED`, or `MAINTENANCE` |
| `DELETE` | `/rooms/:roomId` | Owner/manager | Delete only when no active reservation references the room |
| `GET` | `/room-types` | Hotel member | Shared room types and room counts |
| `POST` | `/room-types` | Owner/manager/front desk | `{name,basePrice,maxCapacity,description?}` |
| `PATCH` | `/room-types/:roomTypeId` | Owner/manager | Update type name, description, shared nightly price, or capacity |
| `DELETE` | `/room-types/:roomTypeId` | Owner/manager | Delete only when no room uses the type |
| `GET` | `/bookings` | Hotel member | Reservation list with current folio balance |
| `GET` | `/bookings/:bookingId` | Hotel member | One tenant-scoped reservation |
| `POST` | `/bookings` | Owner/manager/front desk | `{guestName,guestEmail,guestPhone?,roomNumber,checkIn,checkOut,guestsCount,specialReq?}`; dates use `YYYY-MM-DD`; creates guest and invoice transactionally |
| `PATCH` | `/bookings/:bookingId` | Owner/manager/front desk | Update reservation fields before check-in; availability and room capacity are rechecked |
| `DELETE` | `/bookings/:bookingId` | Owner/manager/front desk | Cancel a future reservation; refuses if payments need reconciliation and voids its unpaid folio |
| `POST` | `/bookings/:bookingId/check-in` | Owner/manager/front desk | Check in a scheduled booking and mark its room occupied |
| `POST` | `/bookings/:bookingId/check-out` | Owner/manager/front desk | Check out an in-house guest, mark the room dirty, create a high-priority housekeeping task |

Bookings reject non-positive stays, excess room capacity, rooms under maintenance/cleaning, and overlapping active room assignments. Booking and check-in state changes are validated on the server.

## Guests, operations, and finance

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/guests?q=...` | Hotel member | Search same-hotel guests |
| `POST` | `/guests` | Owner/manager/front desk | Create or update by hotel-scoped email |
| `PATCH` | `/guests/:guestId` | Owner/manager/front desk | Update guest name, email, or phone |
| `DELETE` | `/guests/:guestId` | Owner/manager | Delete only when no reservation history exists |
| `GET` | `/staff` | Hotel member | Employees and upcoming assigned shifts |
| `POST` | `/staff` | Owner/manager | `{name,department,email}` |
| `PATCH` | `/staff/:employeeId` | Owner/manager | `{isActive}` |
| `POST` | `/staff/:employeeId/schedules` | Owner/manager | `{shiftDate,startTime,endTime,notes?}`; overlapping shifts are rejected |
| `GET` | `/housekeeping` | Hotel member | Tasks with room and assignment |
| `POST` | `/housekeeping` | Owner/manager/front desk | `{roomNumber,title,priority,employeeId?}` |
| `PATCH` | `/housekeeping/:taskId` | Owner/manager/front desk/housekeeping | Set status or same-hotel employee assignment |
| `GET` | `/invoices` | Hotel member | Folios with paid and outstanding amounts |
| `POST` | `/invoices/:invoiceId/payments` | Owner/manager/front desk | `{amount,method,reference?}`; method is `CASH`, `CARD`, `BANK_TRANSFER`, `UPI`, or `OTHER`; overpayment is rejected |
| `GET` | `/requests` | Hotel member | Customer requests |
| `POST` | `/requests` | Owner/manager/front desk | `{guestName,guestEmail,kind,details?}`; matches a same-hotel guest and associates an active booking when present |
| `PATCH` | `/requests/:requestId` | Owner/manager/front desk | Set request status (`OPEN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`) |
| `GET` | `/reports?from=YYYY-MM-DD&to=YYYY-MM-DD` | Hotel member | Daily occupancy, room nights, and received payments for up to 366 days |

Payment records are append-only; StayFlow stores no card number or CVV. Cancelled, unpaid folios are marked void. A booking with recorded payments cannot be cancelled until those payments are reconciled externally.

## Email, calendar, holidays, and assistant

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/emails/inbound` | Owner/manager/front desk | Imported email review queue |
| `POST` | `/emails/inbound` | Owner/manager/front desk | `{messageId?,sender,subject?,body}`; extracts likely guest, dates, and room type for review; never creates a booking automatically |
| `POST` | `/emails/outbound` | Owner/manager/front desk | `{guestId,subject,text}`; sends through configured SMTP and logs delivery metadata |
| `POST` | `/webhooks/inbound-email` | Provider webhook secret | Generic inbound provider payload `{to,from,subject?,text?,body?,messageId?}` with `X-StayFlow-Email-Secret`; destination address maps the hotel, not a client hotel ID |
| `GET` | `/integrations/google-calendar` | Hotel member | Connection status |
| `POST` | `/integrations/google-calendar/connect` | Owner/manager | Creates one-use OAuth state and returns Google authorization URL |
| `GET` | `/integrations/google-calendar/callback` | OAuth state | Exchanges code and stores AES-256-GCM encrypted tokens |
| `POST` | `/integrations/google-calendar/sync` | Owner/manager | Upserts active reservation events and removes cancelled events |
| `POST` | `/integrations/calendar/feed-token` | Owner/manager | Rotates a private iCalendar feed token; returns the URL once |
| `GET` | `/calendar/:token.ics` | Private bearer token | iCalendar feed; token is hashed in the database and redacted in request logs |
| `GET` | `/holidays?year=YYYY` | Hotel member | India public holidays for the selected year |
| `POST` | `/assistant` | Hotel member | `{question}`; returns a read-only operational answer and `readOnly: true` |

Email import stores raw inbound message text for staff review. External mailbox/provider setup is still required for delivery into the webhook. SMTP configuration is all-or-none. Google Calendar requires OAuth credentials, callback registration, and a persistent 64-hex-character encryption key. The assistant falls back to local read-only answers without an OpenAI key; with a key, it sends aggregate/room data, redacts known guest/staff names and email addresses plus known guest phone numbers from the question, and exposes no function tools.

## Health and errors

- `GET /health` — API liveness and whether `DATABASE_URL` is configured.
- `GET /health/ready` — executes a read-only `SELECT 1`; returns `503` if the database is missing or unreachable.
- Validation errors return `400` with `details` containing field paths and messages.
- Common codes include `UNAUTHENTICATED`, `SESSION_EXPIRED`, `HOTEL_ACCESS_DENIED`, `PERMISSION_DENIED`, `BOOKING_CONFLICT`, `ROOM_UNAVAILABLE`, `DATABASE_UNAVAILABLE`, and `RATE_LIMITED`.

Limits: request JSON is capped at 1 MB, inbound email text at 100 KB, staff email body at 20 KB, and collection endpoints return bounded result sets.
