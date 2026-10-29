import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, assertSameOrigin, clientIp, handler, json, rateLimited, readJson } from "@/lib/http";
import { hitRateLimit, peekRateLimit } from "@/lib/rate-limit";
import { createInitialAdmin } from "@/lib/auth/setup";
import { startAdminSession } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

const schema = z.object({ setupCode: z.string().max(200), username: z.string().max(100), password: z.string().max(256) });

/** Creates the one admin account using the server's one-time setup code. */
export const POST = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  const key = `admin-setup-fail:${ip}`;
  const current = await peekRateLimit(key, 10);
  if (!current.allowed) throw rateLimited(current.retryAfterSec, "Too many attempts. Try again in a few minutes.");

  const body = await readJson(req, schema, 2048);
  const result = await createInitialAdmin(body);
  if (!result.ok) {
    if (result.code === "bad_code") await hitRateLimit(key, 10, 15 * 60);
    throw new ApiError(result.status, result.code, result.message);
  }
  await startAdminSession(result.adminId, { ip, userAgent: req.headers.get("user-agent") });
  return json({ ok: true }, 201);
});
