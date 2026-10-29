import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/admin";
import { PageHeader } from "@/components/admin/shell";
import { Badge, EmptyState, Panel } from "@/components/ui/misc";
import { formatPin } from "@/lib/game/pin";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Results" };
export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  await requireAdminPage();
  const sessions = await prisma.gameSession.findMany({
    where: { OR: [{ state: { not: "LOBBY" } }, { teamCount: { gt: 0 } }] },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      pin: true,
      state: true,
      teamCount: true,
      questionCount: true,
      startedAt: true,
      endedAt: true,
      teams: { where: { finalRank: 1, removedAt: null }, select: { name: true, score: true }, take: 3 },
    },
  });

  return (
    <div>
      <PageHeader title="Results" description="Rankings and per-question statistics. Only you can see this page." />
      <div className="px-5 py-6 sm:px-8">
        <Panel>
          {sessions.length === 0 ? (
            <EmptyState title="No results yet">Results appear here once a game has teams.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {sessions.map((s) => (
                <li key={s.id}>
                  <Link href={`/admin/results/${s.id}`} className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-white/[0.02]">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold">{s.title}</p>
                      <p className="mt-0.5 text-[13px] text-mute">
                        PIN {formatPin(s.pin)}, {s.teamCount} teams, {s.questionCount} questions
                        {s.endedAt ? `, ended ${formatDateTime(s.endedAt)}` : s.startedAt ? `, started ${formatDateTime(s.startedAt)}` : ""}
                      </p>
                    </div>
                    {s.teams.length > 0 ? (
                      <span className="text-[14px] text-mute">
                        Winner <span className="font-semibold text-text">{s.teams.map((t) => t.name).join(", ")}</span>
                      </span>
                    ) : null}
                    <Badge tone={s.state === "FINISHED" ? "neutral" : "good"}>{s.state === "FINISHED" ? "Final" : "In progress"}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
