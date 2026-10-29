import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, assertSameOrigin, clientIp, handler, json, rateLimited, readJson } from "@/lib/http";
import { hitRateLimit, peekRateLimit } from "@/lib/rate-limit";
import { normalizePin } from "@/lib/game/pin";
import { envInt } from "@/lib/config";
import { joinAvailability } from "@/lib/join";

export const dynamic = "force-dynamic";

const schema = z.object({ pin: z.string().max(20) });

/** Step 1 of joining: checks a PIN and says whether the game accepts teams. */
export const POST = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  const failLimit = envInt("RATE_LIMIT_PIN_FAILURES_PER_IP", 100);
  const failures = await peekRateLimit(`pin-fail:${ip}`, failLimit);
  if (!failures.allowed) throw rateLimited(failures.retryAfterSec, "Too many incorrect PINs from this network. Wait a few minutes and try again.");

  const { pin: rawPin } = await readJson(req, schema, 1024);
  const pin = normalizePin(rawPin);
  if (!pin) throw new ApiError(400, "bad_pin", "Game PINs are 8 digits.");

  const session = await prisma.gameSession.findUnique({
    where: { pin },
    select: { title: true, state: true, registrationOpen: true, allowLateJoin: true, teamCount: true, capacity: true },
  });
  if (!session) {
    await hitRateLimit(`pin-fail:${ip}`, failLimit, 600);
    throw new ApiError(404, "not_found", "No game uses that PIN. Check the number on the screen.");
  }
  const availability = joinAvailability(session);
  if (!availability.ok) throw new ApiError(409, availability.code, availability.message);
  return json({ ok: true, pin, title: session.title });
});
