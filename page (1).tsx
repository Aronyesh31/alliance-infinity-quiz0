import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/admin";
import { PageHeader } from "@/components/admin/shell";
import { NewGameForm } from "@/components/admin/new-game-form";
import { SessionRowActions } from "@/components/admin/session-row-actions";
import { Badge, EmptyState, Panel, PanelHeader } from "@/components/ui/misc";
import { formatPin } from "@/lib/game/pin";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Games" };
export const dynamic = "force-dynamic";

const tone = { LOBBY: "flux", QUESTION: "good", REVEAL: "ion", PAUSED: "warn", FINISHED: "neutral" } as const;
const label = { LOBBY: "Lobby", QUESTION: "Live", REVEAL: "Live", PAUSED: "Paused", FINISHED: "Finished" } as const;

export default async function GamesPage() {
  await requireAdminPage();
  const [quizzes, sessions] = await Promise.all([
    prisma.quiz.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, timingMode: true, _count: { select: { questions: true } } },
    }),
    prisma.gameSession.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, title: true, pin: true, state: true, teamCount: true, questionCount: true, createdAt: true },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Games" description="Create a game from a published quiz, then run it from the control room." />
      <div className="grid gap-6 px-5 py-6 sm:px-8 xl:grid-cols-[minmax(0,400px)_1fr]">
        <Panel className="self-start">
          <PanelHeader title="New game" description="Questions are copied when the game is created, so later quiz edits don't affect it." />
          {quizzes.length === 0 ? (
            <EmptyState title="No published quizzes">
              <Link className="text-flux underline-offset-4 hover:underline" href="/admin/quizzes">
                Publish a quiz
              </Link>{" "}
              first, then come back here.
            </EmptyState>
          ) : (
            <NewGameForm quizzes={quizzes.map((q) => ({ id: q.id, title: q.title, questions: q._count.questions, standard: q.timingMode === "STANDARD" }))} />
          )}
        </Panel>

        <Panel className="min-w-0">
          <PanelHeader title="All games" />
          {sessions.length === 0 ? (
            <EmptyState title="No games yet">Your games will be listed here.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px]">
                <thead className="text-[12px] text-faint">
                  <tr className="border-b border-line">
                    <th className="px-5 py-2.5 font-medium">Game</th>
                    <th className="px-3 py-2.5 font-medium">PIN</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 text-right font-medium">Teams</th>
                    <th className="px-3 py-2.5 font-medium">Created</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.02]">
                      <td className="max-w-64 px-5 py-3">
                        <Link href={`/admin/games/${s.id}`} className="block truncate font-medium hover:text-flux">
                          {s.title}
                        </Link>
                        <span className="text-[12px] text-faint">{s.questionCount} questions</span>
                      </td>
                      <td className="px-3 py-3 font-display tabular">{formatPin(s.pin)}</td>
                      <td className="px-3 py-3">
                        <Badge tone={tone[s.state]}>{label[s.state]}</Badge>
                      </td>
                      <td className="px-3 py-3 text-right tabular">{s.teamCount}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-mute">{formatDateTime(s.createdAt)}</td>
                      <td className="px-5 py-3">
                        <SessionRowActions id={s.id} title={s.title} state={s.state} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
