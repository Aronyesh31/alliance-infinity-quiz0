import { REALTIME_TICKET_TTL_MS } from "../config";
import { hmacBase64Url, randomToken, safeEqual } from "../security/tokens";

/**
 * Short-lived, HMAC-signed credentials that let a browser open a socket to the
 * separately hosted realtime server. The browser's real session lives in an
 * HTTP-only cookie on the app's origin; the app exchanges it for a ticket that
 * expires in 60 seconds and is only used during the socket handshake.
 */
export type TicketPayload =
  | { role: "team"; teamId: string; sessionId: string; iat: number; exp: number; jti: string }
  | { role: "admin"; adminSessionId: string; iat: number; exp: number; jti: string };

type TicketClaims =
  | { role: "team"; teamId: string; sessionId: string }
  | { role: "admin"; adminSessionId: string };

export function signTicket(claims: TicketClaims, secret: string, now = Date.now()): string {
  const payload = { ...claims, iat: now, exp: now + REALTIME_TICKET_TTL_MS, jti: randomToken(9) };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${hmacBase64Url(secret, `aic.ticket.v1.${body}`)}`;
}

export function verifyTicket(ticket: unknown, secret: string, now = Date.now()): TicketPayload | null {
  if (typeof ticket !== "string" || ticket.length > 2048) return null;
  const parts = ticket.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  if (!safeEqual(signature, hmacBase64Url(secret, `aic.ticket.v1.${body}`))) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.exp !== "number" || p.exp < now) return null;
  if (typeof p.iat !== "number" || p.iat > now + 30_000) return null;
  if (p.role === "team" && typeof p.teamId === "string" && typeof p.sessionId === "string") {
    return p as unknown as TicketPayload;
  }
  if (p.role === "admin" && typeof p.adminSessionId === "string") {
    return p as unknown as TicketPayload;
  }
  return null;
}

// ─── Server-to-server notifications (Next.js → realtime) ───────────────────────

export const INTERNAL_TS_HEADER = "x-aic-timestamp";
export const INTERNAL_SIG_HEADER = "x-aic-signature";
const INTERNAL_MAX_SKEW_MS = 30_000;

export function signInternal(body: string, secret: string, ts = Date.now()) {
  return { ts: String(ts), signature: hmacBase64Url(secret, `aic.internal.v1.${ts}.${body}`) };
}

export function verifyInternal(body: string, ts: string | undefined, signature: string | undefined, secret: string, now = Date.now()): boolean {
  if (!ts || !signature) return false;
  const t = Number(ts);
  if (!Number.isFinite(t) || Math.abs(now - t) > INTERNAL_MAX_SKEW_MS) return false;
  return safeEqual(signature, hmacBase64Url(secret, `aic.internal.v1.${ts}.${body}`));
}
