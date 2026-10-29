import { prisma, isUniqueViolation } from "../db";
import { hashPassword, passwordProblem } from "./password";
import { safeEqual, sha256Hex } from "../security/tokens";

/**
 * First-run admin setup without a terminal. Enabled only when ADMIN_SETUP_CODE
 * (16+ characters) is set on the server, and only until the single admin
 * account exists. Whoever holds the one-time code chooses the username and
 * password; the code is useless afterwards.
 */
export function setupCodeConfigured(): boolean {
  return (process.env.ADMIN_SETUP_CODE ?? "").length >= 16;
}

export async function adminExists(): Promise<boolean> {
  return (await prisma.admin.count()) > 0;
}

export type SetupResult =
  | { ok: true; adminId: number; username: string }
  | { ok: false; status: number; code: string; message: string };

export function normalizeUsername(input: string): string | null {
  const u = input.trim().toLowerCase();
  return /^[a-z0-9._-]{3,40}$/.test(u) ? u : null;
}

export async function createInitialAdmin(input: { setupCode: string; username: string; password: string }): Promise<SetupResult> {
  const expected = process.env.ADMIN_SETUP_CODE ?? "";
  if (expected.length < 16) return { ok: false, status: 404, code: "disabled", message: "Web setup is turned off on this server." };
  if (await adminExists()) return { ok: false, status: 410, code: "done", message: "The admin account already exists. Sign in instead." };
  // Compare fixed-length digests so timing reveals nothing about the code.
  if (!safeEqual(sha256Hex(input.setupCode.trim()), sha256Hex(expected))) {
    return { ok: false, status: 403, code: "bad_code", message: "That setup code is not correct." };
  }
  const username = normalizeUsername(input.username);
  if (!username) {
    return { ok: false, status: 400, code: "bad_username", message: "Use 3–40 characters: lowercase letters, numbers, dot, dash or underscore." };
  }
  const problem = passwordProblem(input.password, username);
  if (problem) return { ok: false, status: 400, code: "weak_password", message: problem };
  try {
    const admin = await prisma.admin.create({ data: { id: 1, username, passwordHash: await hashPassword(input.password) } });
    return { ok: true, adminId: admin.id, username: admin.username };
  } catch (error) {
    // Two setups racing: the database allows exactly one admin row.
    if (isUniqueViolation(error)) return { ok: false, status: 410, code: "done", message: "The admin account already exists. Sign in instead." };
    throw error;
  }
}
