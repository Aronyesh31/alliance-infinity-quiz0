import type { NextRequest } from "next/server";
import { endAdminSession, requireAdminApi } from "@/lib/auth/admin";
import { handler, json } from "@/lib/http";
import { notifyRealtime } from "@/lib/realtime/notify";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: NextRequest) => {
  const admin = await requireAdminApi(req);
  await endAdminSession(admin.sessionId);
  await notifyRealtime({ type: "admin.loggedOut", adminSessionId: admin.sessionId });
  return json({ ok: true });
});
