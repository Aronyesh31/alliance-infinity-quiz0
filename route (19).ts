import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth/admin";
import { ApiError, handler, json, readJson } from "@/lib/http";
import { sessionSettingsSchema } from "@/lib/validation/quiz";
import { notifyRealtime } from "@/lib/realtime/notify";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ sessionId: string }> };

/** Settings can only change in the lobby, so nobody's rules change mid-game. */
export const PATCH = handler(async (req: NextRequest, ctx: Ctx) => {
  await requireAdminApi(req);
  const { sessionId } = await ctx.params;
  const { settings } = await readJson(req, z.object({ settings: sessionSettingsSchema }), 4096);
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId }, select: { state: true, teamCount: true } });
  if (!session) throw new ApiError(404, "not_found", "Game not found.");
  if (session.state !== "LOBBY") throw new ApiError(409, "started", "Settings are locked once the game starts.");
  if (settings.capacity < session.teamCount) {
    throw new ApiError(400, "capacity_too_low", `${session.teamCount} teams have already joined. Capacity cannot be lower than that.`);
  }
  const updated = await prisma.gameSession.updateMany({ where: { id: sessionId, state: "LOBBY" }, data: settings });
  if (updated.count === 0) throw new ApiError(409, "started", "Settings are locked once the game starts.");
  await notifyRealtime({ type: "session.updated", sessionId });
  return json({ ok: true });
});

export const DELETE = handler(async (req: NextRequest, ctx: Ctx) => {
  await requireAdminApi(req);
  const { sessionId } = await ctx.params;
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId }, select: { state: true } });
  if (!session) throw new ApiError(404, "not_found", "Game not found.");
  if (session.state !== "LOBBY" && session.state !== "FINISHED") {
    throw new ApiError(409, "running", "End the game before deleting it.");
  }
  await prisma.gameSession.delete({ where: { id: sessionId } });
  await notifyRealtime({ type: "session.deleted", sessionId });
  return json({ ok: true });
});
