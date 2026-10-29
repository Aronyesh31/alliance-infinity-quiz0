import "server-only";
import { realtimeInternalUrl, sharedSecret } from "../config";
import type { InternalNotification } from "./protocol";
import { INTERNAL_SIG_HEADER, INTERNAL_TS_HEADER, signInternal } from "./ticket";

/**
 * Tells the realtime server about changes made through the web app (a team
 * joined, settings changed…). Best-effort: the realtime server also reloads
 * from the database when sockets connect, so a failed notification only delays
 * a lobby update.
 */
export async function notifyRealtime(notification: InternalNotification): Promise<boolean> {
  const body = JSON.stringify(notification);
  const { ts, signature } = signInternal(body, sharedSecret());
  try {
    const res = await fetch(`${realtimeInternalUrl()}/internal/notify`, {
      method: "POST",
      headers: { "content-type": "application/json", [INTERNAL_TS_HEADER]: ts, [INTERNAL_SIG_HEADER]: signature },
      body,
      signal: AbortSignal.timeout(2000),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function realtimeHealth(): Promise<{ ok: boolean; leader?: boolean; sockets?: number; latencyMs?: number; error?: string }> {
  const t0 = Date.now();
  try {
    const res = await fetch(`${realtimeInternalUrl()}/healthz`, { signal: AbortSignal.timeout(3000), cache: "no-store" });
    const data = (await res.json()) as { ok: boolean; leader: boolean; sockets: number };
    return { ok: res.ok && data.ok, leader: data.leader, sockets: data.sockets, latencyMs: Date.now() - t0 };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
