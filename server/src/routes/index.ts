import { Router } from "express";
import { databaseConfigured } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { assistantRouter } from "./assistant.js";
import { authRouter } from "./auth.js";
import { bookingsRouter } from "./bookings.js";
import { dashboardRouter } from "./dashboard.js";
import { emailsRouter } from "./emails.js";
import { emailWebhookRouter } from "./emailWebhook.js";
import { hotelsRouter } from "./hotels.js";
import { calendarPublicRouter, googleCallbackRouter, holidaysRouter, integrationsRouter } from "./integrations.js";
import { guestsRouter, housekeepingRouter, invoicesRouter, reportsRouter, requestsRouter, staffRouter } from "./operations.js";
import { roomTypesRouter, roomsRouter } from "./rooms.js";

export const apiRouter = Router();

apiRouter.use((_request, _response, next) => {
  if (!databaseConfigured) {
    next(new HttpError(503, "Database is not configured. Set DATABASE_URL before using hotel operations.", "DATABASE_UNAVAILABLE"));
    return;
  }
  next();
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/calendar", calendarPublicRouter);
apiRouter.use("/webhooks", emailWebhookRouter);
apiRouter.use("/integrations/google-calendar/callback", googleCallbackRouter);
apiRouter.use(requireAuth);
apiRouter.use("/hotels", hotelsRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/rooms", roomsRouter);
apiRouter.use("/room-types", roomTypesRouter);
apiRouter.use("/bookings", bookingsRouter);
apiRouter.use("/guests", guestsRouter);
apiRouter.use("/staff", staffRouter);
apiRouter.use("/housekeeping", housekeepingRouter);
apiRouter.use("/invoices", invoicesRouter);
apiRouter.use("/requests", requestsRouter);
apiRouter.use("/reports", reportsRouter);
apiRouter.use("/emails", emailsRouter);
apiRouter.use("/assistant", assistantRouter);
apiRouter.use("/integrations", integrationsRouter);
apiRouter.use("/holidays", holidaysRouter);
