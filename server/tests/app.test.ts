import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { databaseConfigured } from "../src/lib/prisma.js";
import { hashPassword, verifyPassword } from "../src/lib/security.js";
import { extractBookingDetails } from "../src/routes/emails.js";
import { indianPublicHolidays } from "../src/routes/integrations.js";
import { localDate, localDateTimeToUtc } from "../src/lib/time.js";

const app = createApp();

test("GET /health reports API and database status separately", async () => {
  const response = await request(app).get("/health").expect(200);

  assert.equal(response.body.status, "ok");
  assert.equal(response.body.checks.api, "ok");
  assert.equal(response.body.checks.database, databaseConfigured ? "configured" : "unconfigured");
  assert.match(response.headers["x-request-id"] ?? "", /^[0-9a-f-]{36}$/i);
});

test("unknown routes return the centralized not-found response", async () => {
  const response = await request(app).get("/does-not-exist").expect(404);

  assert.equal(response.body.error.code, "NOT_FOUND");
  assert.match(response.body.error.message, /GET \/does-not-exist/);
  assert.ok(response.body.error.requestId);
});

test("security headers are present", async () => {
  const response = await request(app).get("/health").expect(200);

  assert.equal(response.headers["x-powered-by"], undefined);
  assert.ok(response.headers["x-content-type-options"]);
});

test("malformed JSON receives a client error and request ID", async () => {
  const response = await request(app)
    .post("/health")
    .set("Content-Type", "application/json")
    .send("{")
    .expect(400);

  assert.equal(response.body.error.code, "INVALID_JSON");
  assert.ok(response.body.error.requestId);
  assert.equal(response.body.error.requestId, response.headers["x-request-id"]);
});

test("mutating API requests reject origins outside the CORS allowlist", async () => {
  const response = await request(app)
    .post("/api/auth/login")
    .set("Origin", "https://untrusted.example")
    .send({ email: "user@example.com", password: "not-a-real-password" })
    .expect(403);

  assert.equal(response.body.error.code, "ORIGIN_NOT_ALLOWED");
  assert.ok(response.body.error.requestId);
});

test("hotel data endpoints require an authenticated session", async () => {
  const response = await request(app).get("/api/rooms").expect(401);

  assert.equal(response.body.error.code, "UNAUTHENTICATED");
  assert.ok(response.body.error.requestId);
});

test("password storage uses a salted one-way scrypt hash", async () => {
  const hash = await hashPassword("stayflow-test-password");

  assert.match(hash, /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/i);
  assert.notEqual(hash, "stayflow-test-password");
  assert.equal(await verifyPassword("stayflow-test-password", hash), true);
  assert.equal(await verifyPassword("incorrect-password", hash), false);
});

test("inbound booking email extraction requests review and does not create a booking", () => {
  const extracted = extractBookingDetails(
    "Please reserve Deluxe Suite for Jane Doe from 2026-11-05 to 2026-11-08. jane@example.com",
    ["Deluxe Suite", "Standard King"],
  );

  assert.equal(extracted.guestName, "Jane Doe");
  assert.equal(extracted.guestEmail, "jane@example.com");
  assert.equal(extracted.roomType, "Deluxe Suite");
  assert.equal(extracted.checkIn, "2026-11-05");
  assert.equal(extracted.checkOut, "2026-11-08");
  assert.equal(extracted.complete, true);
});

test("India holiday data includes Republic Day for the requested year", () => {
  const holidays = indianPublicHolidays(2026);

  assert.ok(holidays.some((holiday) => holiday.date === "2026-01-26" && /Republic Day/i.test(holiday.name)));
});

test("hotel-local midnight converts to the correct UTC reporting boundary", () => {
  const midnight = localDateTimeToUtc("2026-10-01", "Asia/Kolkata");

  assert.equal(midnight.toISOString(), "2026-09-30T18:30:00.000Z");
  assert.equal(localDate(midnight, "Asia/Kolkata"), "2026-10-01");
});
