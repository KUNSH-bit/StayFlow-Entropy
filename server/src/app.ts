import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler, HttpError } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { apiRouter } from "./routes/index.js";
import { databaseConfigured, getPrisma } from "./lib/prisma.js";
import { originGuard } from "./middleware/originGuard.js";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin) return callback(null, false);
      return callback(null, env.CORS_ORIGINS.includes(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Hotel-Id", "X-Request-Id"],
  }));
  app.use(requestLogger);
  app.use(express.json({ limit: "1mb" }));
  app.use("/api", originGuard);

  app.get("/health", (_request, response) => {
    response.status(200).json({
      status: "ok",
      service: "stayflow-api",
      timestamp: new Date().toISOString(),
      checks: {
        api: "ok",
        database: databaseConfigured ? "configured" : "unconfigured",
      },
    });
  });

  app.get("/health/ready", async (_request, response, next) => {
    if (!databaseConfigured) {
      next(new HttpError(503, "Database is not configured.", "DATABASE_UNAVAILABLE"));
      return;
    }
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      response.status(200).json({ status: "ready", checks: { api: "ok", database: "ok" } });
    } catch {
      next(new HttpError(503, "Database connection is unavailable.", "DATABASE_UNAVAILABLE"));
    }
  });

  app.use("/api", apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
