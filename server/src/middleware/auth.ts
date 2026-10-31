import type { RequestHandler } from "express";
import { MembershipRole } from "../generated/prisma/client.js";
import { getPrisma } from "../lib/prisma.js";
import { getCookie, hashToken, SESSION_COOKIE } from "../lib/security.js";
import { HttpError } from "./errorHandler.js";

export const requireAuth: RequestHandler = async (request, _response, next) => {
  try {
    const token = getCookie(request, SESSION_COOKIE);
    if (!token) throw new HttpError(401, "Sign in to continue.", "UNAUTHENTICATED");
    const session = await getPrisma().session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!session) throw new HttpError(401, "Your session is no longer valid. Please sign in again.", "SESSION_EXPIRED");
    if (session.expiresAt <= new Date()) {
      await getPrisma().session.delete({ where: { id: session.id } }).catch(() => undefined);
      throw new HttpError(401, "Your session has expired. Please sign in again.", "SESSION_EXPIRED");
    }
    request.auth = { user: session.user, sessionId: session.id };
    next();
  } catch (error) {
    next(error);
  }
};

export function requireHotelMember(...allowedRoles: MembershipRole[]): RequestHandler {
  return async (request, _response, next) => {
    try {
      if (!request.auth) throw new HttpError(401, "Sign in to continue.", "UNAUTHENTICATED");
      const requestedHotelId = request.get("x-hotel-id");
      const memberships = await getPrisma().hotelMembership.findMany({
        where: { userId: request.auth.user.id },
        orderBy: { createdAt: "asc" },
      });
      const membership = requestedHotelId
        ? memberships.find((item) => item.hotelId === requestedHotelId)
        : memberships[0];
      if (!membership) throw new HttpError(403, "You do not have access to this hotel.", "HOTEL_ACCESS_DENIED");
      if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
        throw new HttpError(403, "Your hotel role does not allow this action.", "PERMISSION_DENIED");
      }
      request.membership = membership;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function hotelId(request: Parameters<RequestHandler>[0]): string {
  if (!request.membership) throw new HttpError(403, "Select a hotel first.", "HOTEL_ACCESS_DENIED");
  return request.membership.hotelId;
}

export const canManage = [MembershipRole.OWNER, MembershipRole.MANAGER] as const;
export const canOperate = [MembershipRole.OWNER, MembershipRole.MANAGER, MembershipRole.FRONT_DESK] as const;
