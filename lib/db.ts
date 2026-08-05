import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// Reuse across warm serverless isolates (production + local HMR).
globalForPrisma.prisma = prisma;

export type { JobOffer, JobOfferStatus, Prisma } from "@prisma/client";
