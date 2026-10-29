import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2, Radio, BarChart3 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/admin";
import { PageHeader } from "@/components/admin/shell";
import { LiveSessionCard } from "@/components/admin/live-session-card";
import { Button } from "@/components/ui/button";
import { EmptyState, Panel, PanelHeader } from "@/components/ui/misc";
import { formatPin } from "@/lib/game/pin";

export const metadata: Metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  await requireAdminPage();
  const [quizCounts, sessionCount, active] = await Promise.all([
    prisma.quiz.groupBy({ by: ["status"], _count: true }),
    prisma.gameSession.count(),
    prisma.gameSession.findFirst({
      where: { state: { not: "FINISHED" } },
      orderBy: [{ startedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      select: { id: true, title: true, pin: true, state: true, teamCount: true, questionCount: true },
    }),
  ]);
  const published = quizCounts.find((c) => c.status === "PUBLISHED")?._count ?? 0;
  const drafts = quizCounts.find((c) => c.status === "DRAFT")?._count ?? 0;

  const stats = [
    { label: "Quizzes", value: published + drafts, detail: `${published} published, ${drafts} drafts` },
    { label: "Games created", value: sessionCount, detail: "All time" },
    { label: "Teams in current game", value: active?.teamCount ?? 0, detail: active ? active.title : "No game in progress" },
  ];

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Everything for today’s event at a glance."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/admin/quizzes/new">
                <FilePlus2 /> New quiz
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/games">
                <Radio /> New game
              </Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-6 px-5 py-6 sm:px-8">
        <dl className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="bg-night/95 px-5 py-4">
              <dt className="text-[13px] text-mute">{s.label}</dt>
              <dd className="mt-1 font-display text-[30px] font-bold tabular">{s.value.toLocaleString("en-IN")}</dd>
              <dd className="truncate text-[13px] text-faint">{s.detail}</dd>
            </div>
          ))}
        </dl>

        {active ? (
          <LiveSessionCard session={{ ...active, pinLabel: formatPin(active.pin) }} />
        ) : (
          <Panel>
            <PanelHeader title="Current game" />
            <EmptyState
              title="No game in progress"
              action={
                <Button asChild>
                  <Link href="/admin/games">Create a game</Link>
                </Button>
              }
            >
              Create a game from a published quiz to get a PIN for teams.
            </EmptyState>
          </Panel>
        )}

        <div className="flex flex-wrap gap-3 text-[14px]">
          <Button asChild variant="ghost">
            <Link href="/admin/results">
              <BarChart3 /> Past results
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
