import { randomBytes } from "node:crypto";
import { Router, type Response } from "express";
import { MembershipRole } from "../generated/prisma/client.js";
import { env } from "../config/env.js";
import { getPrisma } from "../lib/prisma.js";
import { hashPassword, hashToken, newSessionToken, setSessionCookie, clearSessionCookie, verifyPassword } from "../lib/security.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { z } from "zod";

export const authRouter = Router();
const registrationLimit = rateLimit({ windowMs: 60 * 60_000, limit: 8 });
const loginLimit = rateLimit({ windowMs: 15 * 60_000, limit: 10 });

const registerSchema = z.object({
  name: z.string().trim().min(2).max(255),
  email: z.string().trim().email().max(255),
  password: z.string().min(12).max(128),
  hotelName: z.string().trim().min(2).max(255).optional(),
  inviteToken: z.string().min(32).max(128).optional(),
});
const loginSchema = z.object({ email: z.string().trim().email().max(255), password: z.string().min(1).max(128) });

async function issueSession(userId: string, response: Response): Promise<void> {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60_000);
  await getPrisma().session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  setSessionCookie(response, token, expiresAt);
}

async function membershipsFor(userId: string) {
  const rows = await getPrisma().hotelMembership.findMany({
    where: { userId },
    include: { hotel: { select: { id: true, name: true, subdomain: true, currency: true, timeZone: true } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(({ hotel, role }) => ({ hotelId: hotel.id, hotelName: hotel.name, subdomain: hotel.subdomain, currency: hotel.currency, timeZone: hotel.timeZone, role }));
}

authRouter.post("/register", registrationLimit, async (request, response) => {
  const input = registerSchema.parse(request.body);
  const email = input.email.toLowerCase();
  if (!input.inviteToken && !input.hotelName) throw new HttpError(400, "Property name is required when creating a new hotel.", "HOTEL_NAME_REQUIRED");
  const passwordHash = await hashPassword(input.password);
  const subdomain = `${(input.hotelName ?? "hotel").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "hotel"}-${randomBytes(3).toString("hex")}`;
  const user = await getPrisma().$transaction(async (tx) => {
    const invite = input.inviteToken ? await tx.membershipInvite.findUnique({ where: { tokenHash: hashToken(input.inviteToken) } }) : null;
    if (input.inviteToken && (!invite || invite.acceptedAt || invite.expiresAt <= new Date() || invite.email.toLowerCase() !== email)) {
      throw new HttpError(400, "The hotel invitation is invalid, expired, or addressed to another email.", "INVITE_INVALID");
    }
    const createdUser = await tx.user.create({ data: { name: input.name, email, passwordHash } });
    let targetHotelId: string;
    if (invite) {
      const consumed = await tx.membershipInvite.updateMany({ where: { id: invite.id, acceptedAt: null, expiresAt: { gt: new Date() } }, data: { acceptedAt: new Date() } });
      if (consumed.count !== 1) throw new HttpError(409, "This invitation has already been accepted.", "INVITE_ALREADY_ACCEPTED");
      await tx.hotelMembership.create({ data: { userId: createdUser.id, hotelId: invite.hotelId, role: invite.role } });
      targetHotelId = invite.hotelId;
    } else {
      const hotelName = input.hotelName;
      if (!hotelName) throw new HttpError(400, "Property name is required when creating a new hotel.", "HOTEL_NAME_REQUIRED");
      const hotel = await tx.hotel.create({
        data: {
          name: hotelName,
          subdomain,
          ...(env.INBOUND_EMAIL_DOMAIN ? { inboundEmailAddress: `${subdomain}@${env.INBOUND_EMAIL_DOMAIN}` } : {}),
        },
      });
      await tx.hotelMembership.create({ data: { userId: createdUser.id, hotelId: hotel.id, role: MembershipRole.OWNER } });
      targetHotelId = hotel.id;
    }
    const token = newSessionToken();
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60_000);
    await tx.session.create({ data: { userId: createdUser.id, tokenHash: hashToken(token), expiresAt } });
    return { createdUser, targetHotelId, token, expiresAt };
  });
  setSessionCookie(response, user.token, user.expiresAt);
  response.status(201).json({
    user: { id: user.createdUser.id, name: user.createdUser.name, email: user.createdUser.email },
    memberships: await membershipsFor(user.createdUser.id),
    activeHotelId: user.targetHotelId,
  });
});

authRouter.post("/login", loginLimit, async (request, response) => {
  const input = loginSchema.parse(request.body);
  const user = await getPrisma().user.findUnique({ where: { email: input.email.toLowerCase() } });
  const passwordOk = user ? await verifyPassword(input.password, user.passwordHash) : (await hashPassword(input.password), false);
  if (!user || !passwordOk) throw new HttpError(401, "Email or password is incorrect.", "INVALID_CREDENTIALS");
  await issueSession(user.id, response);
  const memberships = await membershipsFor(user.id);
  response.status(200).json({
    user: { id: user.id, name: user.name, email: user.email },
    memberships,
    activeHotelId: memberships[0]?.hotelId ?? null,
  });
});

authRouter.get("/me", requireAuth, async (request, response) => {
  const user = request.auth!.user;
  const memberships = await membershipsFor(user.id);
  response.json({ user: { id: user.id, name: user.name, email: user.email }, memberships, activeHotelId: memberships[0]?.hotelId ?? null });
});

authRouter.post("/logout", requireAuth, async (request, response) => {
  await getPrisma().session.delete({ where: { id: request.auth!.sessionId } });
  clearSessionCookie(response);
  response.status(204).end();
});

const acceptInviteSchema = z.object({ token: z.string().min(32).max(128) });
authRouter.post("/accept-invite", requireAuth, async (request, response) => {
  const { token } = acceptInviteSchema.parse(request.body);
  const invite = await getPrisma().membershipInvite.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!invite || invite.acceptedAt || invite.expiresAt <= new Date()) {
    throw new HttpError(404, "This invitation is invalid or has expired.", "INVITE_NOT_FOUND");
  }
  if (invite.email.toLowerCase() !== request.auth!.user.email.toLowerCase()) {
    throw new HttpError(403, "Sign in with the email address that received this invitation.", "INVITE_EMAIL_MISMATCH");
  }
  await getPrisma().$transaction(async (tx) => {
    await tx.hotelMembership.upsert({
      where: { userId_hotelId: { userId: request.auth!.user.id, hotelId: invite.hotelId } },
      create: { userId: request.auth!.user.id, hotelId: invite.hotelId, role: invite.role },
      update: { role: invite.role },
    });
    await tx.membershipInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
  });
  response.status(200).json({ memberships: await membershipsFor(request.auth!.user.id), activeHotelId: invite.hotelId });
});
