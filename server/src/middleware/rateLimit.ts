import type { RequestHandler } from "express";
import { HttpError } from "./errorHandler.js";

type Entry = { count: number; resetAt: number };

export function rateLimit(options: { windowMs: number; limit: number; key?: (ip: string) => string }): RequestHandler {
  const entries = new Map<string, Entry>();
  let lastPrune = 0;

  return (request, _response, next) => {
    const now = Date.now();
    if (now - lastPrune > options.windowMs) {
      for (const [key, entry] of entries) if (entry.resetAt <= now) entries.delete(key);
      lastPrune = now;
    }
    const ip = request.ip || request.socket.remoteAddress || "unknown";
    const key = options.key?.(ip) ?? ip;
    let entry = entries.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + options.windowMs };
      entries.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > options.limit) {
      next(new HttpError(429, "Too many requests. Please try again later.", "RATE_LIMITED"));
      return;
    }
    next();
  };
}
