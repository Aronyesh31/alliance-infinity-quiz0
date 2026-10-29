import { prisma } from "./db";

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  retryAfterSec: number;
}

/**
 * Fixed-window counter stored in Postgres so every serverless instance and the
 * realtime server share the same view. One atomic upsert per call.
 */
export async function hitRateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, now() + make_interval(secs => ${windowSec}))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" <= now() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= now() THEN EXCLUDED."resetAt" ELSE "RateLimit"."resetAt" END
    RETURNING "count", "resetAt"`;
  const row = rows[0];
  // Opportunistic cleanup of expired windows (~1% of calls).
  if (Math.random() < 0.01) {
    void prisma.$executeRaw`DELETE FROM "RateLimit" WHERE "resetAt" < now() - interval '1 hour'`.catch(() => {});
  }
  const retryAfterSec = Math.max(1, Math.ceil((row.resetAt.getTime() - Date.now()) / 1000));
  return { allowed: row.count <= limit, count: row.count, limit, retryAfterSec };
}

/** Reads a counter without incrementing it. */
export async function peekRateLimit(key: string, limit: number): Promise<RateLimitResult> {
  const row = await prisma.rateLimit.findUnique({ where: { key } });
  if (!row || row.resetAt.getTime() <= Date.now()) return { allowed: true, count: 0, limit, retryAfterSec: 0 };
  const retryAfterSec = Math.max(1, Math.ceil((row.resetAt.getTime() - Date.now()) / 1000));
  return { allowed: row.count < limit, count: row.count, limit, retryAfterSec };
}

export async function clearRateLimit(key: string): Promise<void> {
  await prisma.rateLimit.deleteMany({ where: { key } });
}
