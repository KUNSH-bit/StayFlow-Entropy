import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { logger } from "../lib/logger.js";

export const requestLogger: RequestHandler = (request, response, next) => {
  const startedAt = process.hrtime.bigint();
  request.requestId = randomUUID();
  response.setHeader("X-Request-Id", request.requestId);

  response.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const path = request.path.startsWith("/api/calendar/") ? "/api/calendar/:feedToken.ics" : request.path;
    logger.info("http_request", {
      requestId: request.requestId,
      method: request.method,
      path,
      statusCode: response.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
    });
  });

  next();
};
