import { Router } from "express";
import { env } from "../config/env.js";
import { getPrisma } from "../lib/prisma.js";
import { constantTimeTokenMatch } from "../lib/security.js";
import { HttpError } from "../middleware/errorHandler.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { extractBookingDetails } from "./emails.js";
import { z } from "zod";

export const emailWebhookRouter = Router();
const inboundLimit = rateLimit({ windowMs: 60_000, limit: 120 });
const providerPayload = z.object({
  to: z.string().trim().min(3).max(1000),
  from: z.string().trim().min(3).max(255),
  subject: z.string().trim().max(500).optional(),
  text: z.string().max(100_000).optional(),
  body: z.string().max(100_000).optional(),
  messageId: z.string().trim().max(255).optional(),
}).refine((payload) => Boolean(payload.text?.trim() || payload.body?.trim()), "Email body is required.");

emailWebhookRouter.post("/inbound-email", inboundLimit, async (request, response) => {
  if (!env.INBOUND_EMAIL_DOMAIN || !env.INBOUND_EMAIL_WEBHOOK_SECRET) {
    throw new HttpError(503, "Inbound email webhook is not configured.", "EMAIL_NOT_CONFIGURED");
  }
  const providedSecret = request.get("x-stayflow-email-secret");
  if (!providedSecret || !constantTimeTokenMatch(env.INBOUND_EMAIL_WEBHOOK_SECRET, providedSecret)) {
    throw new HttpError(401, "Webhook authentication failed.", "WEBHOOK_UNAUTHORIZED");
  }
  const input = providerPayload.parse(request.body);
  const recipient = input.to.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase();
  const sender = input.from.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase();
  if (!recipient || !sender) throw new HttpError(400, "Email sender or recipient address is invalid.", "INVALID_EMAIL_ADDRESS");
  const hotel = await getPrisma().hotel.findUnique({ where: { inboundEmailAddress: recipient }, select: { id: true } });
  if (!hotel) throw new HttpError(404, "No hotel is configured for this inbound address.", "INBOUND_HOTEL_NOT_FOUND");
  const body = input.text?.trim() || input.body?.trim() || "";
  const roomTypes = await getPrisma().roomType.findMany({ where: { hotelId: hotel.id }, select: { name: true } });
  const extraction = extractBookingDetails(`${input.subject ?? ""}\n${body}`, roomTypes.map((roomType) => roomType.name));
  const email = await getPrisma().inboundEmail.create({
    data: {
      hotelId: hotel.id,
      sender,
      body,
      status: "REVIEW_REQUIRED",
      extraction,
      ...(input.messageId ? { messageId: input.messageId } : {}),
      ...(input.subject ? { subject: input.subject } : {}),
    },
  });
  response.status(202).json({ received: true, emailId: email.id, reviewRequired: true });
});
