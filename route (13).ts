import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, json, rateLimited, readJson } from "@/lib/http";
import { hitRateLimit } from "@/lib/rate-limit";
import { hashPassword, passwordProblem, requireAdminApi, verifyPassword } from "@/lib/auth/admin";
import { notifyRealtime } from "@/lib/realtime/notify";

export const dynamic = "force-dynamic";

const schema = z.object({ currentPassword: z.string().max(256), newPassword: z.string().max(256) });

/** Changes the admin password and signs out every other admin session. */
export const POST = handler(async (req: NextRequest) => {
  const ctx = await requireAdminApi(req);
  const limit = await hitRateLimit(`admin-password:${ctx.adminId}`, 5, 15 * 60);
  if (!limit.allowed) throw rateLimited(limit.retryAfterSec, "Too many attempts. Try again later.");

  const { currentPassword, newPassword } = await readJson(req, schema, 2048);
  const admin = await prisma.admin.findUniqueOrThrow({ where: { id: ctx.adminId } });
  if (!(await verifyPassword(admin.passwordHash, currentPassword))) {
    throw new ApiError(400, "wrong_password", "The current password is incorrect.");
  }
  const problem = passwordProblem(newPassword, admin.username);
  if (problem) throw new ApiError(400, "weak_password", problem);
  if (newPassword === currentPassword) throw new ApiError(400, "same_password", "Choose a password you have not used here before.");

  const others = await prisma.adminSession.findMany({
    where: { adminId: admin.id, id: { not: ctx.sessionId } },
    select: { id: true },
  });
  await prisma.$transaction([
    prisma.admin.update({
      where: { id: admin.id },
      data: { passwordHash: await hashPassword(newPassword), passwordChangedAt: new Date() },
    }),
    prisma.adminSession.deleteMany({ where: { adminId: admin.id, id: { not: ctx.sessionId } } }),
  ]);
  await Promise.all(others.map((s) => notifyRealtime({ type: "admin.loggedOut", adminSessionId: s.id })));
  return json({ ok: true, signedOutSessions: others.length });
});
