import nodemailer from "nodemailer";
import { Router } from "express";
import { getPrisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { canOperate, hotelId, requireHotelMember } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { z } from "zod";

export const emailsRouter = Router();

export function extractBookingDetails(text: string, roomTypes: string[]) {
  const dates = Array.from(text.matchAll(/\b20\d{2}-\d{2}-\d{2}\b/g), (match) => match[0]).slice(0, 2);
  const nameMatch = text.match(/\b(?:for|guest(?:\s+name)?\s*[:=-])\s+([A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*){1,3}?)(?=\s+(?:from|between|check[\s-]?in|arrival|on)\b|[.,;]|$)/i);
  const guestEmail = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() ?? null;
  const lowerText = text.toLowerCase();
  const roomType = roomTypes.find((name) => lowerText.includes(name.toLowerCase())) ?? null;
  return {
    guestName: nameMatch?.[1]?.trim() ?? null,
    guestEmail,
    roomType,
    checkIn: dates[0] ?? null,
    checkOut: dates[1] ?? null,
    complete: Boolean(nameMatch && dates.length === 2 && roomType),
  };
}

const inboundSchema = z.object({
  messageId: z.string().trim().max(255).optional(),
  sender: z.string().trim().min(3).max(255),
  subject: z.string().trim().max(500).optional(),
  body: z.string().trim().min(1).max(100_000),
});

emailsRouter.get("/inbound", requireHotelMember(...canOperate), async (request, response) => {
  const emails = await getPrisma().inboundEmail.findMany({ where: { hotelId: hotelId(request) }, orderBy: { receivedAt: "desc" }, take: 100 });
  response.json({ emails });
});

emailsRouter.post("/inbound", requireHotelMember(...canOperate), async (request, response) => {
  const input = inboundSchema.parse(request.body);
  const id = hotelId(request);
  const roomTypes = await getPrisma().roomType.findMany({ where: { hotelId: id }, select: { name: true } });
  const extraction = extractBookingDetails(`${input.subject ?? ""}\n${input.body}`, roomTypes.map((roomType) => roomType.name));
  const email = await getPrisma().inboundEmail.create({
    data: { hotelId: id, sender: input.sender, body: input.body, extraction, status: "REVIEW_REQUIRED", ...(input.messageId ? { messageId: input.messageId } : {}), ...(input.subject ? { subject: input.subject } : {}) },
  });
  response.status(201).json({ email, extractedBooking: extraction });
});

emailsRouter.post("/outbound", requireHotelMember(...canOperate), async (request, response) => {
  const input = z.object({ guestId: z.string().uuid(), subject: z.string().trim().min(1).max(500), text: z.string().trim().min(1).max(20_000) }).parse(request.body);
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASSWORD || !env.SMTP_FROM) {
    throw new HttpError(503, "Outbound email is not configured. Add the SMTP settings to the server environment.", "EMAIL_NOT_CONFIGURED");
  }
  const id = hotelId(request);
  const guest = await getPrisma().guest.findFirst({ where: { id: input.guestId, hotelId: id } });
  if (!guest) throw new HttpError(404, "Guest not found.", "GUEST_NOT_FOUND");
  const transport = nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465, auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } });
  let result: { messageId?: string };
  try {
    result = await transport.sendMail({ from: env.SMTP_FROM, to: guest.email, subject: input.subject, text: input.text });
  } catch {
    throw new HttpError(502, "The email provider could not send this message.", "EMAIL_SEND_FAILED");
  } finally {
    transport.close();
  }
  const logged = await getPrisma().outboundEmail.create({ data: { hotelId: id, recipient: guest.email, subject: input.subject, ...(result.messageId ? { providerMessageId: result.messageId } : {}) } });
  response.status(201).json({ message: { id: logged.id, recipient: logged.recipient, subject: logged.subject, sentAt: logged.sentAt } });
});
