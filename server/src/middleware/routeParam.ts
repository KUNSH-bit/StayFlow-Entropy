import type { Request } from "express";
import { HttpError } from "./errorHandler.js";

export function routeParam(request: Request, name: string): string {
  const value = request.params[name];
  if (typeof value !== "string" || value.length === 0) throw new HttpError(404, "The requested route value was not found.", "NOT_FOUND");
  return value;
}
