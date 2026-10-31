import { randomBytes } from "node:crypto";
import { Router } from "express";
import { MembershipRole } from "../generated/prisma/client.js";
import { env } from "../config/env.js";
import { getPrisma } from "../lib/prisma.js";
import { hashToken } from "../lib/security.js";
import { canManage, hotelId, requireHotelMember } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { routeParam } from "../middleware/routeParam.js";
import { z } from "zod";

export const hotelsRouter = Router();

hotelsRouter.get("/", async (request, response, next) => {
  try {
    if (!request.auth) throw new HttpError(401, "Sign in to continue.", "UNAUTHENTICATED");
    const memberships = await getPrisma().hotelMembership.findMany({ where: { userId: request.auth.user.id }, include: { hotel: true }, orderBy: { createdAt: "asc" } });
    response.json({ hotels: memberships.map(({ hotel, role }) => ({ id: hotel.id, name: hotel.name, subdomain: hotel.subdomain, currency: hotel.currency, timeZone: hotel.timeZone, role })) });
  } catch (error) { next(error); }
});

hotelsRouter.get("/current", requireHotelMember(), async (request, response) => {
  const hotel = await getPrisma().hotel.findUniqueOrThrow({ where: { id: hotelId(request) } });
  response.json({ hotel, role: request.membership!.role });
});

hotelsRouter.patch("/current", requireHotelMember(...canManage), async (request, response) => {
  const input = z.object({ name: z.string().trim().min(2).max(255).optional(), currency: z.string().trim().regex(/^[A-Z]{3}$/).optional(), timeZone: z.string().trim().min(3).max(100).optional() }).refine((body) => Object.keys(body).length > 0).parse(request.body);
  if (input.timeZone) {
    try { new Intl.DateTimeFormat("en", { timeZone: input.timeZone }); } catch { throw new HttpError(400, "The time zone is invalid.", "INVALID_TIME_ZONE"); }
  }
  const hotel = await getPrisma().hotel.update({ where: { id: hotelId(request) }, data: {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.currency !== undefined ? { currency: input.currency } : {}),
    ...(input.timeZone !== undefined ? { timeZone: input.timeZone } : {}),
  } });
  response.json({ hotel });
});

hotelsRouter.get("/memberships", requireHotelMember(...canManage), async (request, response) => {
  const memberships = await getPrisma().hotelMembership.findMany({
    where: { hotelId: hotelId(request) }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
  response.json({ memberships: memberships.map(({ id, user, role, createdAt }) => ({ id, userId: user.id, name: user.name, email: user.email, role, createdAt })) });
});

const inviteRoles = [MembershipRole.MANAGER, MembershipRole.FRONT_DESK, MembershipRole.HOUSEKEEPING, MembershipRole.VIEWER] as const;
hotelsRouter.post("/invites", requireHotelMember(...canManage), async (request, response) => {
  const input = z.object({ email: z.string().trim().email().max(255), role: z.enum(inviteRoles).default(MembershipRole.FRONT_DESK) }).parse(request.body);
  const token = randomBytes(32).toString("base64url");
  const invite = await getPrisma().membershipInvite.upsert({
    where: { hotelId_email: { hotelId: hotelId(request), email: input.email.toLowerCase() } },
    create: { hotelId: hotelId(request), invitedById: request.auth!.user.id, email: input.email.toLowerCase(), role: input.role, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 7 * 86_400_000), acceptedAt: null },
    update: { invitedById: request.auth!.user.id, role: input.role, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 7 * 86_400_000), acceptedAt: null },
  });
  const hotel = await getPrisma().hotel.findUniqueOrThrow({ where: { id: invite.hotelId }, select: { name: true } });
  response.status(201).json({ invite: { id: invite.id, email: invite.email, role: invite.role, expiresAt: invite.expiresAt, inviteUrl: `${env.FRONTEND_URL}/?invite=${encodeURIComponent(token)}` } });
});

hotelsRouter.patch("/memberships/:membershipId", requireHotelMember(...canManage), async (request, response) => {
  const input = z.object({ role: z.enum(inviteRoles) }).parse(request.body);
  const id = hotelId(request);
  const member = await getPrisma().hotelMembership.findFirst({ where: { id: routeParam(request, "membershipId"), hotelId: id } });
  if (!member) throw new HttpError(404, "Hotel member not found.", "MEMBERSHIP_NOT_FOUND");
  if (member.role === MembershipRole.OWNER && request.membership?.role !== MembershipRole.OWNER) throw new HttpError(403, "Only an owner can change an owner's role.", "PERMISSION_DENIED");
  if (member.role === MembershipRole.OWNER && member.userId === request.auth!.user.id) throw new HttpError(409, "You cannot change your own owner role.", "LAST_OWNER_PROTECTED");
  const updated = await getPrisma().hotelMembership.update({ where: { id: member.id }, data: { role: input.role } });
  response.json({ membership: updated });
});

hotelsRouter.delete("/memberships/:membershipId", requireHotelMember(...canManage), async (request, response) => {
  const id = hotelId(request);
  const member = await getPrisma().hotelMembership.findFirst({ where: { id: routeParam(request, "membershipId"), hotelId: id } });
  if (!member) throw new HttpError(404, "Hotel member not found.", "MEMBERSHIP_NOT_FOUND");
  if (member.role === MembershipRole.OWNER) {
    const owners = await getPrisma().hotelMembership.count({ where: { hotelId: id, role: MembershipRole.OWNER } });
    if (owners <= 1 || member.userId === request.auth!.user.id) throw new HttpError(409, "Transfer ownership before removing this owner.", "LAST_OWNER_PROTECTED");
  }
  await getPrisma().hotelMembership.delete({ where: { id: member.id } });
  response.status(204).end();
});
