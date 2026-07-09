import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton.
 * Next.js hot-reloads modules in dev, which would otherwise open a new DB
 * connection on every reload. Caching on globalThis prevents connection leaks.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
