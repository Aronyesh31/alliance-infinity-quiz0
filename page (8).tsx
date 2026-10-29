import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/admin";
import { appOrigin, realtimePublicUrl } from "@/lib/config";
import { realtimeHealth } from "@/lib/realtime/notify";
import { PageHeader } from "@/components/admin/shell";
import { PasswordForm } from "@/components/admin/password-form";
import { Panel, PanelHeader, StatusDot } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await requireAdminPage();
  const t0 = Date.now();
  const [admin, sessions, dbOk, realtime] = await Promise.all([
    prisma.admin.findUniqueOrThrow({ where: { id: ctx.adminId }, select: { username: true, passwordChangedAt: true } }),
    prisma.adminSession.findMany({ where: { expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" }, select: { id: true, ipAddress: true, userAgent: true, lastSeenAt: true } }),
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    realtimeHealth(),
  ]);
  const dbMs = Date.now() - t0;

  const checks = [
    { label: "Database", ok: dbOk, detail: dbOk ? `Reachable (${dbMs} ms round trip)` : "Not reachable — check DATABASE_URL" },
    {
      label: "Realtime server",
      ok: realtime.ok && realtime.leader === true,
      detail: realtime.ok
        ? realtime.leader
          ? `Running at ${realtimePublicUrl()} with ${realtime.sockets ?? 0} open connections (${realtime.latencyMs} ms)`
          : "Running but waiting for leadership — another instance may still be shutting down"
        : `Not reachable at ${realtimePublicUrl()} (${realtime.error ?? "no response"})`,
    },
  ];

  return (
    <div>
      <PageHeader title="Settings" description="Your account and the health of the event systems." />
      <div className="grid gap-6 px-5 py-6 sm:px-8 xl:grid-cols-2">
        <Panel className="self-start">
          <PanelHeader title="System status" description={`Public site: ${appOrigin()}`} />
          <ul className="divide-y divide-line">
            {checks.map((c) => (
              <li key={c.label} className="flex items-start gap-3 px-5 py-4">
                <span className="mt-1.5">
                  <StatusDot tone={c.ok ? "good" : "bad"} />
                </span>
                <div>
                  <p className="text-[14px] font-semibold">{c.label}</p>
                  <p className="text-[13px] text-mute">{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="self-start">
          <PanelHeader title="Admin account" description={`Signed in as ${admin.username}. Password last changed ${formatDateTime(admin.passwordChangedAt)}.`} />
          <PasswordForm />
        </Panel>

        <Panel className="self-start xl:col-span-2">
          <PanelHeader title="Active admin sessions" description="Changing the password signs out every session except this one." />
          <ul className="divide-y divide-line text-[14px]">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-3">
                <span className="font-medium">{s.id === ctx.sessionId ? "This browser" : "Another browser"}</span>
                <span className="text-mute">{s.ipAddress ?? "Unknown IP"}</span>
                <span className="min-w-0 flex-1 truncate text-faint">{s.userAgent ?? ""}</span>
                <span className="text-mute">Last active {formatDateTime(s.lastSeenAt)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
