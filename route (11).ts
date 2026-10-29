import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, assertSameOrigin, clientIp, handler, json, rateLimited, readJson } from "@/lib/http";
import { clearRateLimit, hitRateLimit, peekRateLimit } from "@/lib/rate-limit";
import { burnPasswordCheck, startAdminSession, verifyPassword } from "@/lib/auth/admin";
import { envInt } from "@/lib/config";

export const dynamic = "force-dynamic";

const schema = z.object({ username: z.string().max(100), password: z.string().max(256) });
const WINDOW_SEC = 15 * 60;

export const POST = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  const limit = envInt("RATE_LIMIT_ADMIN_LOGIN_FAILURES_PER_IP", 10);
  const key = `admin-login-fail:${ip}`;
  const current = await peekRateLimit(key, limit);
  if (!current.allowed) {
    throw rateLimited(current.retryAfterSec, `Too many failed sign-in attempts. Try again in ${Math.ceil(current.retryAfterSec / 60)} minutes.`);
  }

  const { username, password } = await readJson(req, schema, 2048);
  const admin = await prisma.admin.findUnique({ where: { username: username.trim().toLowerCase() } });
  const valid = admin ? await verifyPassword(admin.passwordHash, password) : (await burnPasswordCheck(password), false);

  if (!admin || !valid) {
    await hitRateLimit(key, limit, WINDOW_SEC);
    throw new ApiError(401, "invalid_credentials", "Incorrect username or password.");
  }

  await clearRateLimit(key);
  await startAdminSession(admin.id, { ip, userAgent: req.headers.get("user-agent") });
  return json({ ok: true });
});
