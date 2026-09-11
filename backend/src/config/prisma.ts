import { PrismaClient } from "@prisma/client";

// Singleton — tránh mở nhiều connection pool khi tsx watch reload hoặc module bị import nhiều nơi.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
