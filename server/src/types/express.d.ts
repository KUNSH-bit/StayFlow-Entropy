import type { HotelMembership, User } from "../generated/prisma/client.js";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      auth?: { user: User; sessionId: string };
      membership?: HotelMembership;
    }
  }
}

export {};
