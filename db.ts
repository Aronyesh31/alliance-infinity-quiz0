import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { envInt } from "./config";

// One client per process. In development, Next.js hot-reloads modules, so the
// instance is cached on globalThis to avoid exhausting connections.
const globalForPrisma = globalThis as unknown as { __aicPrisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");
  const adapter = new PrismaPg({
    connectionString,
    max: envInt("DB_POOL_MAX", 5),
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.__aicPrisma ?? createClient();
globalForPrisma.__aicPrisma = prisma;

/** True for unique-constraint violations from both the query builder (P2002) and raw SQL (P2010 / 23505). */
export function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const e = error as { code?: string; meta?: { driverAdapterError?: { cause?: { originalCode?: string; kind?: string } } } };
  if (e.code === "P2002") return true;
  const cause = e.meta?.driverAdapterError?.cause;
  return e.code === "P2010" && (cause?.originalCode === "23505" || cause?.kind === "UniqueConstraintViolation");
}

/** Collision-resistant id for rows inserted with raw SQL (same shape as Prisma's cuid: lowercase alphanumerics). */
export function newId(): string {
  const bytes = randomBytes(16);
  let out = "c";
  for (const b of bytes) out += (b % 36).toString(36);
  return out + Date.now().toString(36);
}
