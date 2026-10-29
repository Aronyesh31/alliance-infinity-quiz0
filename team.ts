import "server-only";
import { cookies } from "next/headers";
import { prisma } from "../db";
import { isProduction, TEAM_COOKIE, TEAM_SESSION_TTL_MS } from "../config";
import { sha256Hex } from "../security/tokens";

/** The team bound to this device's HTTP-only cookie, if any. */
export async function getTeamFromCookie() {
  const jar = await cookies();
  const token = jar.get(TEAM_COOKIE())?.value;
  if (!token || token.length > 200) return null;
  const team = await prisma.team.findUnique({
    where: { tokenHash: sha256Hex(token) },
    select: {
      id: true,
      name: true,
      sessionId: true,
      removedAt: true,
      joinedAt: true,
      session: { select: { id: true, pin: true, state: true, title: true } },
    },
  });
  if (!team || team.removedAt) return null;
  if (Date.now() - team.joinedAt.getTime() > TEAM_SESSION_TTL_MS) return null;
  return team;
}

export async function setTeamCookie(token: string) {
  const jar = await cookies();
  jar.set(TEAM_COOKIE(), token, {
    httpOnly: true,
    secure: isProduction(),
    // Lax so the cookie survives arriving from a QR-scanner app or a link.
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(TEAM_SESSION_TTL_MS / 1000),
  });
}
