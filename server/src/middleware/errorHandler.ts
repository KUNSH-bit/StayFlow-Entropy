import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger.js";

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code = "REQUEST_ERROR",
  ) {
    super(message);
    this.name = "HttpError";
  }
}

function getBodyParserErrorType(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("type" in error)) {
    return undefined;
  }

  return typeof error.type === "string" ? error.type : undefined;
}

export const errorHandler: ErrorRequestHandler = (error: unknown, request, response, _next) => {
  if (response.headersSent) {
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
        requestId: request.requestId,
      },
    });
    return;
  }

  const bodyParserErrorType = getBodyParserErrorType(error);
  if (bodyParserErrorType === "entity.parse.failed") {
    response.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Request body must contain valid JSON.",
        requestId: request.requestId,
      },
    });
    return;
  }

  if (bodyParserErrorType === "entity.too.large") {
    response.status(413).json({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Request body exceeds the 1 MB limit.",
        requestId: request.requestId,
      },
    });
    return;
  }

  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        requestId: request.requestId,
      },
    });
    return;
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String(error.code);
    if (code === "P2002") {
      response.status(409).json({ error: { code: "CONFLICT", message: "A record with those details already exists.", requestId: request.requestId } });
      return;
    }
    if (code === "P2003" || code === "P2025") {
      response.status(404).json({ error: { code: "NOT_FOUND", message: "The requested record was not found.", requestId: request.requestId } });
      return;
    }
    if (code === "P2034") {
      response.status(409).json({ error: { code: "CONFLICT", message: "The record changed while this request was being processed. Please retry.", requestId: request.requestId } });
      return;
    }
  }

  logger.error("unhandled_request_error", {
    requestId: request.requestId,
    error: error instanceof Error ? error.name : "Unknown error",
  });

  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
      requestId: request.requestId,
    },
  });
};
