import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();

test("GET /health reports API and database status separately", async () => {
  const response = await request(app).get("/health").expect(200);

  assert.equal(response.body.status, "ok");
  assert.equal(response.body.checks.api, "ok");
  assert.equal(response.body.checks.database, "not_integrated");
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
