import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, isUniqueViolation, newId } from "@/lib/db";
import { ApiError, assertSameOrigin, clientIp, handler, json, rateLimited, readJson } from "@/lib/http";
import { hitRateLimit } from "@/lib/rate-limit";
import { normalizePin } from "@/lib/game/pin";
import { normalizeTeamName } from "@/lib/game/team-name";
import { envInt } from "@/lib/config";
import { joinAvailability } from "@/lib/join";
import { getTeamFromCookie, setTeamCookie } from "@/lib/auth/team";
import { randomToken, sha256Hex } from "@/lib/security/tokens";
import { notifyRealtime } from "@/lib/realtime/notify";

export const dynamic = "force-dynamic";

const schema = z.object({ pin: z.string().max(20), teamName: z.string().max(200) });

/** Step 2 of joining: registers the team and binds this device to it. */
export const POST = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  const limit = await hitRateLimit(`join:${ip}`, envInt("RATE_LIMIT_JOIN_PER_IP", 3000), 600);
  if (!limit.allowed) throw rateLimited(limit.retryAfterSec, "Too many join attempts from this network. Wait a minute and try again.");

  const body = await readJson(req, schema, 2048);
  const pin = normalizePin(body.pin);
  if (!pin) throw new ApiError(400, "bad_pin", "Game PINs are 8 digits.");

  const session = await prisma.gameSession.findUnique({
    where: { pin },
    select: { id: true, title: true, state: true, registrationOpen: true, allowLateJoin: true, teamCount: true, capacity: true },
  });
  if (!session) throw new ApiError(404, "not_found", "No game uses that PIN.");

  // A device that already joined this game gets its team back instead of a duplicate.
  const existing = await getTeamFromCookie();
  if (existing && existing.sessionId === session.id) {
    return json({ ok: true, sessionId: session.id, teamName: existing.name, resumed: true });
  }

  const name = normalizeTeamName(body.teamName);
  if (!name.ok) throw new ApiError(400, "bad_name", name.error);

  const availability = joinAvailability(session);
  if (!availability.ok) throw new ApiError(409, availability.code, availability.message);

  const token = randomToken();
  let rows: { id: string; name: string }[];
  try {
    // One atomic statement: claim a slot (never beyond capacity, only while
    // registration is open) and create the team. If the name is taken the
    // insert fails and the slot claim is rolled back with it. A single
    // statement needs no interactive transaction, so hundreds of teams can
    // join at the same moment without waiting on each other.
    rows = await prisma.$queryRaw<{ id: string; name: string }[]>`
      WITH claimed AS (
        UPDATE "GameSession" SET "teamCount" = "teamCount" + 1, "updatedAt" = now()
        WHERE "id" = ${session.id}
          AND "teamCount" < "capacity"
          AND "registrationOpen" = true
          AND ("state" = 'LOBBY' OR ("allowLateJoin" = true AND "state" IN ('QUESTION', 'REVEAL', 'PAUSED')))
        RETURNING "id"
      )
      INSERT INTO "Team" ("id", "sessionId", "name", "nameKey", "tokenHash")
      SELECT ${newId()}, "id", ${name.name}, ${name.key}, ${sha256Hex(token)} FROM claimed
      RETURNING "id", "name"`;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(409, "name_taken", `"${name.name}" is already taken in this game. Choose a different team name.`);
    }
    throw error;
  }
  const team = rows[0];
  if (!team) {
    const fresh = await prisma.gameSession.findUniqueOrThrow({
      where: { id: session.id },
      select: { state: true, registrationOpen: true, allowLateJoin: true, teamCount: true, capacity: true },
    });
    const why = joinAvailability(fresh);
    throw new ApiError(409, why.ok ? "closed" : why.code, why.ok ? "Registration just closed. Ask the host to reopen it." : why.message);
  }

  await setTeamCookie(token);
  await notifyRealtime({ type: "team.joined", sessionId: session.id, teamId: team.id });
  return json({ ok: true, sessionId: session.id, teamName: team.name, resumed: false }, 201);
});
