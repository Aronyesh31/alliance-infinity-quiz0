"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useGameConnection } from "@/lib/realtime/client";
import { InfinityTimer } from "@/components/game/infinity-timer";
import { Button } from "@/components/ui/button";
import { Badge, Panel, PanelHeader, StatusDot } from "@/components/ui/misc";

const LABEL: Record<string, string> = {
  LOBBY: "Lobby — waiting to start",
  QUESTION: "Question open",
  REVEAL: "Showing results",
  PAUSED: "Paused",
  FINISHED: "Finished",
};

export function LiveSessionCard({ session }: { session: { id: string; title: string; pinLabel: string; questionCount: number } }) {
  const { status, snapshot, admin, offsetMs } = useGameConnection({ role: "admin", sessionId: session.id });
  const q = snapshot?.question;
  const inQuestion = snapshot?.state === "QUESTION" || (snapshot?.state === "PAUSED" && snapshot.pausedFrom === "QUESTION");

  const cells = [
    { label: "Status", value: snapshot ? LABEL[snapshot.state] : "Connecting…" },
    { label: "Question", value: snapshot && snapshot.currentIndex >= 0 ? `${snapshot.currentIndex + 1} of ${snapshot.questionCount}` : `0 of ${session.questionCount}` },
    { label: "Teams registered", value: snapshot ? String(snapshot.teamCount) : "—" },
    { label: "Teams connected", value: admin ? String(admin.connectedCount) : "—" },
    { label: "Answered this question", value: inQuestion && admin ? `${admin.answeredCount} of ${snapshot?.teamCount ?? 0}` : "—" },
  ];

  return (
    <Panel>
      <PanelHeader
        title={session.title}
        description={
          <span className="inline-flex items-center gap-3">
            <span>
              PIN <span className="font-display font-semibold tabular text-text">{session.pinLabel}</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <StatusDot tone={status === "connected" ? "good" : "warn"} />
              {status === "connected" ? "Realtime server connected" : "Connecting to realtime server"}
            </span>
          </span>
        }
        action={
          <div className="flex gap-2">
            <Button asChild variant="secondary" size="sm">
              <a href={`/present/${session.id}`} target="_blank" rel="noopener">
                <ExternalLink /> Presentation
              </a>
            </Button>
            <Button asChild size="sm">
              <Link href={`/admin/games/${session.id}`}>Open control room</Link>
            </Button>
          </div>
        }
      />
      <div className="grid gap-6 p-5 md:grid-cols-[1fr_auto] md:items-center">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          {cells.map((c) => (
            <div key={c.label}>
              <dt className="text-[13px] text-mute">{c.label}</dt>
              <dd className="mt-0.5 text-[16px] font-semibold tabular">{c.value}</dd>
            </div>
          ))}
        </dl>
        {inQuestion && q && snapshot ? (
          <div className="flex flex-col items-center gap-1">
            <InfinityTimer
              deadline={snapshot.deadline}
              totalMs={q.timeLimitSec * 1000}
              offsetMs={offsetMs}
              frozenMs={snapshot.state === "PAUSED" ? snapshot.pausedRemainingMs : null}
              layout="inline"
              numberClassName="text-[28px]"
            />
            <span className="text-[12px] text-faint">Time remaining</span>
          </div>
        ) : snapshot?.state === "LOBBY" ? (
          <Badge tone={snapshot.registrationOpen ? "good" : "warn"}>{snapshot.registrationOpen ? "Registration open" : "Registration closed"}</Badge>
        ) : null}
      </div>
    </Panel>
  );
}
