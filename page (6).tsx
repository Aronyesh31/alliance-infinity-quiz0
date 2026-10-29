import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/admin";
import { loadResults } from "@/lib/results";
import { PageHeader } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, Panel, PanelHeader } from "@/components/ui/misc";
import { CHOICE_COLORS } from "@/components/game/answer-choice";
import { formatPin } from "@/lib/game/pin";
import { choiceLetter, formatDuration } from "@/lib/utils";

export const metadata: Metadata = { title: "Game results" };
export const dynamic = "force-dynamic";

export default async function GameResultsPage({ params }: { params: Promise<{ sessionId: string }> }) {
  await requireAdminPage();
  const { sessionId } = await params;
  const results = await loadResults(sessionId);
  if (!results) notFound();
  const { session, ranked, removed, questionStats } = results;
  const finished = session.state === "FINISHED";

  return (
    <div>
      <PageHeader
        title={session.title}
        description={
          <span className="flex flex-wrap items-center gap-3">
            <span>PIN {formatPin(session.pin)}</span>
            <Badge tone={finished ? "neutral" : "good"}>{finished ? "Final results" : "Live — rankings may still change"}</Badge>
          </span>
        }
        actions={
          <>
            <Button asChild variant="secondary">
              <a href={`/api/admin/sessions/${session.id}/export?kind=answers`}>
                <FileDown /> Every answer (CSV)
              </a>
            </Button>
            <Button asChild>
              <a href={`/api/admin/sessions/${session.id}/export?kind=rankings`}>
                <FileDown /> Rankings (CSV)
              </a>
            </Button>
          </>
        }
      />
      <div className="grid gap-6 px-5 py-6 sm:px-8 2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel className="min-w-0">
          <PanelHeader title="Rankings" description={`${ranked.length} teams ranked by score, then correct answers, then time on correct answers.`} />
          {ranked.length === 0 ? (
            <EmptyState title="No teams">Nobody joined this game.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px]">
                <thead className="text-[12px] text-faint">
                  <tr className="border-b border-line">
                    <th className="px-5 py-2.5 font-medium">Rank</th>
                    <th className="px-3 py-2.5 font-medium">Team</th>
                    <th className="px-3 py-2.5 text-right font-medium">Score</th>
                    <th className="px-3 py-2.5 text-right font-medium">Correct</th>
                    <th className="px-3 py-2.5 text-right font-medium">Answered</th>
                    <th className="px-5 py-2.5 text-right font-medium">Avg time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {ranked.map((t) => (
                    <tr key={t.id}>
                      <td className="px-5 py-2.5 font-display font-semibold tabular text-flux">{t.rank}</td>
                      <td className="max-w-56 truncate px-3 py-2.5 font-medium">{t.name}</td>
                      <td className="px-3 py-2.5 text-right font-display font-semibold tabular">{t.score.toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2.5 text-right tabular">
                        {t.correctCount}/{session.questionCount}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular text-mute">{t.answeredCount}</td>
                      <td className="px-5 py-2.5 text-right tabular text-mute">{formatDuration(t.avgResponseMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {removed.length > 0 ? (
            <p className="border-t border-line px-5 py-3 text-[13px] text-faint">
              Removed and excluded from rankings: {removed.map((t) => t.name).join(", ")}
            </p>
          ) : null}
        </Panel>

        <Panel className="min-w-0 self-start">
          <PanelHeader title="Questions" description="How the room answered each question." />
          <ol className="divide-y divide-line">
            {questionStats.map((q) => {
              const pct = q.answered ? Math.round((q.correct / q.answered) * 100) : 0;
              return (
                <li key={q.index} className="px-5 py-4">
                  <div className="flex gap-3">
                    <span className="font-display text-[13px] font-semibold tabular text-mute">{q.index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium leading-snug">{q.text}</p>
                      <p className="mt-1 text-[12px] text-mute tabular">
                        {pct}% correct, {q.answered} answered, average {formatDuration(q.avgResponseMs)}
                      </p>
                      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-raise" aria-hidden>
                        {q.distribution.map((count, i) => (
                          <span
                            key={i}
                            style={{ width: `${q.answered ? (count / q.answered) * 100 : 0}%`, background: CHOICE_COLORS[i].solid, opacity: i === q.correctIndex ? 1 : 0.35 }}
                          />
                        ))}
                      </div>
                      <p className="mt-1.5 text-[12px] text-faint tabular">
                        {q.distribution.map((count, i) => `${choiceLetter(i)}${i === q.correctIndex ? " ✓" : ""}: ${count}`).join("   ")}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </Panel>
      </div>
      <div className="px-5 pb-8 sm:px-8">
        <Link href="/admin/results" className="text-[14px] text-mute hover:text-text">
          All results
        </Link>
      </div>
    </div>
  );
}
