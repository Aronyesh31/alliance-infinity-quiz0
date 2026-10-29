import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, assertSameOrigin, handler, json, readJson } from "@/lib/http";
import { getTeamFromCookie } from "@/lib/auth/team";
import { getAdmin } from "@/lib/auth/admin";
import { signTicket } from "@/lib/realtime/ticket";
import { realtimePublicUrl, sharedSecret } from "@/lib/config";

export const dynamic = "force-dynamic";

const schema = z.object({ role: z.enum(["team", "admin"]) });

/** Exchanges the HTTP-only session cookie for a 60-second socket ticket. */
export const POST = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  const { role } = await readJson(req, schema, 256);
  if (role === "team") {
    const team = await getTeamFromCookie();
    if (!team) throw new ApiError(401, "no_team", "This device is not part of a game. Join with the game PIN.");
    return json({
      ok: true,
      url: realtimePublicUrl(),
      ticket: signTicket({ role: "team", teamId: team.id, sessionId: team.sessionId }, sharedSecret()),
    });
  }
  const admin = await getAdmin();
  if (!admin) throw new ApiError(401, "unauthorized", "Sign in as the admin to continue.");
  return json({
    ok: true,
    url: realtimePublicUrl(),
    ticket: signTicket({ role: "admin", adminSessionId: admin.sessionId }, sharedSecret()),
  });
});
