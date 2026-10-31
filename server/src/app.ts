import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { requestLogger } from "./middleware/requestLogger.js";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(requestLogger);
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_request, response) => {
    response.status(200).json({
      status: "ok",
      service: "stayflow-api",
      timestamp: new Date().toISOString(),
      checks: {
        api: "ok",
        database: "not_integrated",
      },
    });
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
