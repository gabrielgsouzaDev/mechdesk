// Cliente Prisma compartilhado entre os apps do monorepo.
// Reaproveita a instância em dev para não estourar conexões no hot-reload.
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["query", "error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Reexporta os tipos gerados (enums, models) para uso nos apps.
export * from "@prisma/client";
