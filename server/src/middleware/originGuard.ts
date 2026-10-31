import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { HttpError } from "./errorHandler.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const originGuard: RequestHandler = (request, _response, next) => {
  const origin = request.get("origin");
  if (!SAFE_METHODS.has(request.method) && origin && !env.CORS_ORIGINS.includes(origin)) {
    next(new HttpError(403, "This request origin is not allowed.", "ORIGIN_NOT_ALLOWED"));
    return;
  }
  next();
};
