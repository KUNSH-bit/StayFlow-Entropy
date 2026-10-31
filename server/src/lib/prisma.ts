import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "../config/env.js";

export const databaseConfigured = Boolean(env.DATABASE_URL);

const globalForPrisma = globalThis as typeof globalThis & { stayFlowPrisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }
  if (!globalForPrisma.stayFlowPrisma) {
    globalForPrisma.stayFlowPrisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
    });
  }
  return globalForPrisma.stayFlowPrisma;
}

export async function disconnectDatabase(): Promise<void> {
  await globalForPrisma.stayFlowPrisma?.$disconnect();
  delete globalForPrisma.stayFlowPrisma;
}
