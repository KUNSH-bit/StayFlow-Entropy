import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import Holidays from "date-holidays";
import { Router } from "express";
import { BookingStatus, MembershipRole } from "../generated/prisma/client.js";
import { env } from "../config/env.js";
import { getPrisma } from "../lib/prisma.js";
import { hashToken } from "../lib/security.js";
import { canManage, hotelId, requireHotelMember } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { routeParam } from "../middleware/routeParam.js";
import { z } from "zod";

export const integrationsRouter = Router();
export const calendarPublicRouter = Router();
export const googleCallbackRouter = Router();
export const holidaysRouter = Router();

export function indianPublicHolidays(year: number) {
  const provider = new Holidays("IN");
  return provider.getHolidays(year).filter((holiday) => holiday.type === "public").map((holiday) => ({
    date: holiday.date.slice(0, 10), name: holiday.name, type: holiday.type, observed: holiday.substitute,
  }));
}

function googleConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI && env.INTEGRATION_ENCRYPTION_KEY);
}

function encryptionKey(): Buffer {
  if (!env.INTEGRATION_ENCRYPTION_KEY) throw new HttpError(503, "Google Calendar token encryption is not configured.", "INTEGRATION_NOT_CONFIGURED");
  return Buffer.from(env.INTEGRATION_ENCRYPTION_KEY, "hex");
}

function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}.${cipher.getAuthTag().toString("hex")}.${ciphertext.toString("hex")}`;
}

function decryptSecret(value: string): string {
  const [ivHex, tagHex, ciphertextHex] = value.split(".");
  if (!ivHex || !tagHex || !ciphertextHex) throw new HttpError(503, "Stored calendar credentials are invalid.", "INTEGRATION_CREDENTIALS_INVALID");
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertextHex, "hex")), decipher.final()]).toString("utf8");
  } catch {
    throw new HttpError(503, "Calendar credentials could not be decrypted. Check the integration encryption key.", "INTEGRATION_CREDENTIALS_INVALID");
  }
}

async function tokenRequest(parameters: Record<string, string>) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(parameters),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new HttpError(502, "Google Calendar authorization could not be completed.", "GOOGLE_AUTH_FAILED");
  return z.object({ access_token: z.string(), expires_in: z.number(), refresh_token: z.string().optional() }).parse(await response.json());
}

async function accessToken(integration: { hotelId: string; encryptedRefreshToken: string; encryptedAccessToken: string | null; accessTokenExpiresAt: Date | null }) {
  if (integration.encryptedAccessToken && integration.accessTokenExpiresAt && integration.accessTokenExpiresAt.getTime() > Date.now() + 60_000) {
    return decryptSecret(integration.encryptedAccessToken);
  }
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new HttpError(503, "Google Calendar is not configured.", "INTEGRATION_NOT_CONFIGURED");
  const tokens = await tokenRequest({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: decryptSecret(integration.encryptedRefreshToken),
    grant_type: "refresh_token",
  });
  await getPrisma().googleCalendarIntegration.update({
    where: { hotelId: integration.hotelId },
    data: { encryptedAccessToken: encryptSecret(tokens.access_token), accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000) },
  });
  return tokens.access_token;
}

async function createGoogleAuthorizationUrl(selectedHotelId: string, userId: string): Promise<string> {
  if (!googleConfigured()) throw new HttpError(503, "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, and INTEGRATION_ENCRYPTION_KEY to connect Google Calendar.", "INTEGRATION_NOT_CONFIGURED");
  const state = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  await getPrisma().calendarOAuthState.create({ data: { hotelId: selectedHotelId, userId, stateHash: hashToken(state), expiresAt } });
  const target = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  target.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
    state,
  }).toString();
  return target.toString();
}

integrationsRouter.get("/google-calendar", requireHotelMember(), async (request, response) => {
  const integration = await getPrisma().googleCalendarIntegration.findUnique({ where: { hotelId: hotelId(request) }, select: { id: true, calendarId: true, updatedAt: true } });
  response.json({ configured: googleConfigured(), connected: Boolean(integration), integration });
});

integrationsRouter.get("/google-calendar/connect", requireHotelMember(...canManage), async (request, response) => {
  response.redirect(await createGoogleAuthorizationUrl(hotelId(request), request.auth!.user.id));
});

integrationsRouter.post("/google-calendar/connect", requireHotelMember(...canManage), async (request, response) => {
  response.json({ authorizationUrl: await createGoogleAuthorizationUrl(hotelId(request), request.auth!.user.id) });
});

googleCallbackRouter.get("/", async (request, response) => {
  if (!googleConfigured()) throw new HttpError(503, "Google Calendar is not configured.", "INTEGRATION_NOT_CONFIGURED");
  const query = z.object({ state: z.string().min(16), code: z.string().min(1) }).safeParse(request.query);
  if (!query.success) throw new HttpError(400, "Google did not return a valid authorization response.", "GOOGLE_AUTH_INVALID");
  const stateHash = hashToken(query.data.state);
  const state = await getPrisma().calendarOAuthState.findFirst({ where: { stateHash, consumedAt: null, expiresAt: { gt: new Date() } } });
  if (!state) throw new HttpError(400, "The Google authorization state is invalid or expired.", "GOOGLE_STATE_INVALID");
  const consumed = await getPrisma().calendarOAuthState.updateMany({ where: { id: state.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
  if (consumed.count !== 1) throw new HttpError(400, "The Google authorization state has already been used.", "GOOGLE_STATE_INVALID");
  const membership = await getPrisma().hotelMembership.findFirst({ where: { userId: state.userId, hotelId: state.hotelId, role: { in: [MembershipRole.OWNER, MembershipRole.MANAGER] } }, select: { id: true } });
  if (!membership) throw new HttpError(403, "The initiating account no longer has calendar-management access to this hotel.", "PERMISSION_DENIED");
  const tokens = await tokenRequest({ client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!, code: query.data.code, redirect_uri: env.GOOGLE_REDIRECT_URI!, grant_type: "authorization_code" });
  if (!tokens.refresh_token) throw new HttpError(400, "Google did not return a refresh token. Disconnect the app in Google Account settings and connect again.", "GOOGLE_REFRESH_TOKEN_MISSING");
  await getPrisma().googleCalendarIntegration.upsert({
    where: { hotelId: state.hotelId },
    create: { hotelId: state.hotelId, encryptedRefreshToken: encryptSecret(tokens.refresh_token), encryptedAccessToken: encryptSecret(tokens.access_token), accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000) },
    update: { encryptedRefreshToken: encryptSecret(tokens.refresh_token), encryptedAccessToken: encryptSecret(tokens.access_token), accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000) },
  });
  response.redirect(`${env.FRONTEND_URL}/?calendar=connected`);
});

integrationsRouter.post("/google-calendar/sync", requireHotelMember(...canManage), async (request, response) => {
  const id = hotelId(request);
  const integration = await getPrisma().googleCalendarIntegration.findUnique({ where: { hotelId: id } });
  if (!integration) throw new HttpError(409, "Connect a Google Calendar account before syncing.", "GOOGLE_CALENDAR_NOT_CONNECTED");
  const token = await accessToken(integration);
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  const [bookings, mappings] = await Promise.all([
    getPrisma().booking.findMany({ where: { hotelId: id, status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] }, checkOutDate: { gte: today } }, include: { guest: true, roomReservations: { include: { room: true } } }, orderBy: { checkInDate: "asc" }, take: 250 }),
    getPrisma().calendarEvent.findMany({ where: { hotelId: id }, include: { booking: { select: { status: true } } } }),
  ]);
  const eventByBooking = new Map(mappings.map((mapping) => [mapping.bookingId, mapping]));
  let synced = 0;
  let removed = 0;
  for (const booking of bookings) {
    const event = {
      summary: `${booking.guest.name} · Room ${booking.roomReservations[0]?.room.roomNumber ?? "Unassigned"}`,
      description: `StayFlow booking ${booking.id}`,
      start: { date: booking.checkInDate.toISOString().slice(0, 10) },
      end: { date: booking.checkOutDate.toISOString().slice(0, 10) },
    };
    const existing = eventByBooking.get(booking.id);
    const url = existing
      ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(integration.calendarId)}/events/${encodeURIComponent(existing.externalId)}`
      : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(integration.calendarId)}/events`;
    const result = await fetch(url, {
      method: existing ? "PUT" : "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(15_000),
    });
    if (!result.ok) throw new HttpError(502, "Google Calendar could not sync a reservation.", "GOOGLE_SYNC_FAILED");
    const remote = z.object({ id: z.string() }).parse(await result.json());
    if (existing) await getPrisma().calendarEvent.update({ where: { id: existing.id }, data: { externalId: remote.id } });
    else await getPrisma().calendarEvent.create({ data: { hotelId: id, bookingId: booking.id, externalId: remote.id } });
    synced += 1;
  }
  const activeIds = new Set(bookings.map((booking) => booking.id));
  for (const mapping of mappings) {
    if (activeIds.has(mapping.bookingId) || mapping.booking.status !== BookingStatus.CANCELLED) continue;
    const result = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(integration.calendarId)}/events/${encodeURIComponent(mapping.externalId)}`, {
      method: "DELETE", headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000),
    });
    if (!result.ok && result.status !== 404 && result.status !== 410) throw new HttpError(502, "Google Calendar could not remove a cancelled reservation.", "GOOGLE_SYNC_FAILED");
    await getPrisma().calendarEvent.delete({ where: { id: mapping.id } });
    removed += 1;
  }
  response.json({ synced, removed });
});

integrationsRouter.post("/calendar/feed-token", requireHotelMember(...canManage), async (request, response) => {
  const token = randomBytes(32).toString("base64url");
  await getPrisma().hotel.update({ where: { id: hotelId(request) }, data: { calendarFeedTokenHash: hashToken(token) } });
  response.status(201).json({ url: `${env.API_PUBLIC_URL.replace(/\/$/, "")}/api/calendar/${token}.ics`, token });
});

function icsEscape(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll(";", "\\;").replaceAll(",", "\\,").replaceAll(/\r?\n/g, "\\n");
}

calendarPublicRouter.get("/:token.ics", async (request, response) => {
  const token = routeParam(request, "token");
  const hotel = await getPrisma().hotel.findUnique({ where: { calendarFeedTokenHash: hashToken(token) }, select: { id: true, name: true } });
  if (!hotel) throw new HttpError(404, "Calendar feed not found.", "CALENDAR_FEED_NOT_FOUND");
  const bookings = await getPrisma().booking.findMany({ where: { hotelId: hotel.id, status: { not: BookingStatus.CANCELLED } }, include: { guest: true, roomReservations: { include: { room: true } } }, orderBy: { checkInDate: "asc" }, take: 1000 });
  const stamp = new Date().toISOString().replaceAll("-", "").replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
  const events = bookings.map((booking) => [
    "BEGIN:VEVENT",
    `UID:${booking.id}@stayflow`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${booking.checkInDate.toISOString().slice(0, 10).replaceAll("-", "")}`,
    `DTEND;VALUE=DATE:${booking.checkOutDate.toISOString().slice(0, 10).replaceAll("-", "")}`,
    `SUMMARY:${icsEscape(`${booking.guest.name} · Room ${booking.roomReservations[0]?.room.roomNumber ?? ""}`)}`,
    `DESCRIPTION:${icsEscape(`Hotel: ${hotel.name}; Status: ${booking.status}`)}`,
    "END:VEVENT",
  ].join("\r\n"));
  response.type("text/calendar; charset=utf-8").set("Content-Disposition", "attachment; filename=stayflow-bookings.ics").send(["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//StayFlow//Hotel Reservations//EN", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR", ""].join("\r\n"));
});

holidaysRouter.get("/", requireHotelMember(), async (request, response) => {
  const yearResult = z.coerce.number().int().min(2020).max(2100).safeParse(request.query.year ?? new Date().getFullYear());
  if (!yearResult.success) throw new HttpError(400, "Provide a year between 2020 and 2100.", "INVALID_YEAR");
  response.json({ country: "IN", year: yearResult.data, holidays: indianPublicHolidays(yearResult.data) });
});
