import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { prisma } from "../db";
import { ADMIN_COOKIE, ADMIN_SESSION_TTL_MS, isProduction } from "../config";
import { randomToken, sha256Hex } from "../security/tokens";
export { hashPassword, verifyPassword, burnPasswordCheck, passwordProblem } from "./password";
import { ApiError, assertSameOrigin } from "../http";

export interface AdminContext {
  adminId: number;
  username: string;
  sessionId: string;
  expiresAt: Date;
}

async function loadSession(token: string | undefined): Promise<AdminContext | null> {
  if (!token || token.length > 200) return null;
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: sha256Hex(token) },
    include: { admin: { select: { id: true, username: true } } },
  });
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;
  if (Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
    void prisma.adminSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  }
  return { adminId: session.admin.id, username: session.admin.username, sessionId: session.id, expiresAt: session.expiresAt };
}

/** For server components: returns the admin or null. */
export async function getAdmin(): Promise<AdminContext | null> {
  const jar = await cookies();
  return loadSession(jar.get(ADMIN_COOKIE())?.value);
}

/** For admin pages: redirects to the login page when not signed in. */
export async function requireAdminPage(): Promise<AdminContext> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** For admin API routes: verifies the session (and origin for mutations). */
export async function requireAdminApi(req: NextRequest): Promise<AdminContext> {
  if (req.method !== "GET" && req.method !== "HEAD") assertSameOrigin(req);
  const admin = await loadSession(req.cookies.get(ADMIN_COOKIE())?.value);
  if (!admin) throw new ApiError(401, "unauthorized", "Sign in as the admin to continue.");
  return admin;
}

export async function startAdminSession(adminId: number, meta: { ip: string; userAgent: string | null }) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_MS);
  await prisma.adminSession.create({
    data: {
      adminId,
      tokenHash: sha256Hex(token),
      expiresAt,
      ipAddress: meta.ip.slice(0, 64),
      userAgent: meta.userAgent?.slice(0, 256) ?? null,
    },
  });
  // Housekeeping: drop expired sessions.
  void prisma.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});
  const jar = await cookies();
  jar.set(ADMIN_COOKIE(), token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export async function endAdminSession(sessionId: string) {
  await prisma.adminSession.deleteMany({ where: { id: sessionId } });
  const jar = await cookies();
  jar.set(ADMIN_COOKIE(), "", { httpOnly: true, secure: isProduction(), sameSite: "strict", path: "/", maxAge: 0 });
}
