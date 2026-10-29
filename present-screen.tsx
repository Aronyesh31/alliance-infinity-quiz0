"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, PauseCircle, WifiOff } from "lucide-react";
import { useGameConnection } from "@/lib/realtime/client";
import type { LeaderboardEntry, LobbyUpdate, PublicSnapshot } from "@/lib/realtime/protocol";
import { formatPin } from "@/lib/game/pin";
import { AllianceCrest, Logo } from "@/components/brand/logo";
import { InfinityBackdrop } from "@/components/brand/infinity-backdrop";
import { AnswerChoice } from "./answer-choice";
import { InfinityTimer } from "./infinity-timer";
import { cn } from "@/lib/utils";

interface Props {
  sessionId: string;
  joinHost: string;
  joinUrl: string;
  qr: string;
}

export function PresentScreen({ sessionId, joinHost, qr }: Props) {
  const { status, snapshot, lobby, offsetMs } = useGameConnection({ role: "screen", sessionId });

  if (!snapshot) {
    return (
      <div className="field grid h-dvh place-items-center">
        <div className="flex flex-col items-center gap-6">
          <Logo size="lg" />
          {status === "missing" ? (
            <p className="text-[1.5vw] text-mute">This game no longer exists.</p>
          ) : (
            <Loader2 className="size-10 animate-spin text-ion-soft" />
          )}
        </div>
      </div>
    );
  }

  const showJoinHint = snapshot.state !== "LOBBY" && snapshot.state !== "FINISHED" && snapshot.registrationOpen;

  return (
    <div className="field relative flex h-dvh min-h-[540px] flex-col overflow-hidden px-[3vw] py-[2.4vh] text-[clamp(14px,1.1vw,22px)]">
      <header className="flex items-center justify-between gap-6">
        <Logo size="lg" />
        <div className="flex items-center gap-5 text-right">
          {showJoinHint ? (
            <p className="text-[1.05em] text-mute">
              Join at <span className="font-semibold text-text">{joinHost}</span> with PIN{" "}
              <span className="font-display font-semibold tabular text-text">{formatPin(snapshot.pin)}</span>
            </p>
          ) : (
            <p className="max-w-[40vw] truncate text-[1.05em] text-mute">{snapshot.title}</p>
          )}
          {status !== "connected" ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-warn/15 px-3 py-1 text-[0.85em] text-warn">
              <WifiOff className="size-4" /> Reconnecting
            </span>
          ) : null}
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col pt-[3vh]">
        {snapshot.state === "LOBBY" ? <LobbyScreen snapshot={snapshot} lobby={lobby} joinHost={joinHost} qr={qr} /> : null}
        {snapshot.state === "QUESTION" || (snapshot.state === "PAUSED" && snapshot.pausedFrom === "QUESTION") ? (
          <QuestionScreen snapshot={snapshot} offsetMs={offsetMs} />
        ) : null}
        {snapshot.state === "REVEAL" || (snapshot.state === "PAUSED" && snapshot.pausedFrom === "REVEAL") ? (
          <RevealScreen snapshot={snapshot} offsetMs={offsetMs} />
        ) : null}
        {snapshot.state === "FINISHED" ? <FinalScreen snapshot={snapshot} /> : null}
        {snapshot.state === "PAUSED" ? <PausedOverlay /> : null}
      </div>
    </div>
  );
}

function LobbyScreen({ snapshot, lobby, joinHost, qr }: { snapshot: PublicSnapshot; lobby: LobbyUpdate | null; joinHost: string; qr: string }) {
  const count = lobby?.teamCount ?? snapshot.teamCount;
  const names = lobby?.recentNames ?? [];
  return (
    <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-[3vh]">
      <div className="grid grid-cols-[1fr_auto] items-center gap-[4vw]">
        <div className="animate-rise">
          <p className="text-[1.4em] text-mute">
            Join at <span className="font-semibold text-text">{joinHost}</span>
          </p>
          <p className="mt-[2vh] text-[1.2em] text-mute">Game PIN</p>
          <p className="font-display text-[clamp(4rem,10vw,12rem)] font-bold leading-[0.95] tracking-[0.04em] tabular glow-text">
            {formatPin(snapshot.pin)}
          </p>
          <p className="mt-[2vh] flex items-center gap-3 text-[1.15em]">
            <span className={cn("size-3 rounded-full", snapshot.registrationOpen ? "bg-good" : "bg-warn")} />
            {snapshot.registrationOpen ? "Registration is open" : "Registration is closed"}
          </p>
        </div>
        <figure className="flex flex-col items-center gap-3">
          <div className="overflow-hidden rounded-[1.6vw] bg-white p-[0.6vw] shadow-[0_0_80px_-20px_rgb(61_107_255/0.8)]">
            <div className="size-[min(30vh,22vw)] [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} />
          </div>
          <figcaption className="text-[1em] text-mute">Scan to join</figcaption>
        </figure>
      </div>

      <div className="flex min-h-0 flex-col rounded-[1.4vw] border border-line bg-night/70 p-[1.6vw]">
        <div className="flex items-baseline gap-4">
          <span className="font-display text-[clamp(2.5rem,5vw,6rem)] font-bold leading-none tabular">{count}</span>
          <span className="text-[1.5em] text-mute">{count === 1 ? "team has joined" : "teams have joined"}</span>
        </div>
        <ul className="mt-[2vh] flex min-h-0 flex-1 flex-wrap content-start gap-[0.6vw] overflow-hidden" aria-label="Latest teams">
          {names.slice(0, 60).map((name) => (
            <li key={name} className="animate-rise rounded-full border border-line-strong bg-deep/80 px-[1vw] py-[0.5vh] text-[1.05em] font-medium">
              {name}
            </li>
          ))}
        </ul>
      </div>
      <div className="pointer-events-none absolute -bottom-[10vh] -right-[8vw] w-[42vw] opacity-50">
        <InfinityBackdrop />
      </div>
    </div>
  );
}

function QuestionHeader({ snapshot }: { snapshot: PublicSnapshot }) {
  const q = snapshot.question!;
  return (
    <div className="flex items-baseline justify-between gap-6">
      <p className="font-display text-[1.5em] font-semibold tabular">
        Question {snapshot.currentIndex + 1}
        <span className="text-mute"> of {snapshot.questionCount}</span>
      </p>
      <p className="text-[1.1em] text-mute tabular">{q.points.toLocaleString("en-IN")} points</p>
    </div>
  );
}

function QuestionBody({ snapshot, children }: { snapshot: PublicSnapshot; children: React.ReactNode }) {
  const q = snapshot.question!;
  return (
    <div className="flex min-h-0 flex-col">
      <QuestionHeader snapshot={snapshot} />
      <h1 className="mt-[2.5vh] text-[clamp(1.8rem,2.9vw,3.6rem)] font-semibold leading-[1.22] [overflow-wrap:anywhere]">{q.text}</h1>
      {q.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={q.imageUrl} alt="" className="mt-[2vh] max-h-[26vh] w-auto self-start rounded-[1vw] border border-line object-contain" />
      ) : null}
      <div className={cn("mt-[6vh] grid gap-[1.2vw]", q.choices.length > 2 ? "grid-cols-2" : "grid-cols-1")}>{children}</div>
    </div>
  );
}

function QuestionScreen({ snapshot, offsetMs }: { snapshot: PublicSnapshot; offsetMs: number }) {
  const q = snapshot.question!;
  const paused = snapshot.state === "PAUSED";
  const share = snapshot.teamCount ? snapshot.answeredCount / snapshot.teamCount : 0;
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[1fr_minmax(16rem,24vw)] gap-[3vw]">
      <QuestionBody snapshot={snapshot}>
        {q.choices.map((c, i) => (
          <AnswerChoice key={i} index={i} text={c} size="screen" />
        ))}
      </QuestionBody>
      <aside className="flex flex-col items-center justify-center gap-[4vh] border-l border-line pl-[3vw]">
        <InfinityTimer
          deadline={snapshot.deadline}
          totalMs={q.timeLimitSec * 1000}
          offsetMs={offsetMs}
          frozenMs={paused ? snapshot.pausedRemainingMs : null}
          numberClassName="text-[clamp(3.5rem,6vw,8rem)] mt-[1vh]"
          className="w-full"
        />
        <div className="w-full">
          <p className="text-center font-display text-[2.2em] font-bold tabular">
            {snapshot.answeredCount}
            <span className="text-[0.55em] font-medium text-mute"> / {snapshot.teamCount}</span>
          </p>
          <p className="text-center text-[1em] text-mute">teams have answered</p>
          <div className="mt-[1.5vh] h-2 overflow-hidden rounded-full bg-raise">
            <div className="brand-gradient h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.round(share * 100)}%` }} />
          </div>
        </div>
      </aside>
    </div>
  );
}

function useCountdown(at: number | null, offsetMs: number) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (at === null) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((at - (Date.now() + offsetMs)) / 1000)));
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [at, offsetMs]);
  return left;
}

function RevealScreen({ snapshot, offsetMs }: { snapshot: PublicSnapshot; offsetMs: number }) {
  const q = snapshot.question!;
  const reveal = snapshot.reveal;
  const total = reveal ? Math.max(1, reveal.answeredCount) : 1;
  const left = useCountdown(snapshot.state === "REVEAL" ? snapshot.revealEndsAt : null, offsetMs);
  const last = snapshot.currentIndex + 1 >= snapshot.questionCount;
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[1fr_minmax(16rem,26vw)] gap-[3vw]">
      <QuestionBody snapshot={snapshot}>
        {q.choices.map((c, i) => (
          <AnswerChoice
            key={i}
            index={i}
            text={c}
            size="screen"
            tone={reveal ? (i === reveal.correctIndex ? "correct" : "faded") : "idle"}
            share={reveal ? reveal.distribution[i] / total : null}
            count={reveal ? reveal.distribution[i] : null}
          />
        ))}
      </QuestionBody>
      <aside className="flex min-h-0 flex-col border-l border-line pl-[3vw]">
        <p className="font-display text-[1.3em] font-semibold">Leaderboard</p>
        <Leaderboard entries={(snapshot.leaderboard ?? []).slice(0, 5)} />
        {reveal?.explanation ? <p className="mt-[3vh] text-[1em] leading-relaxed text-mute">{reveal.explanation}</p> : null}
        <p className="mt-auto pt-[2vh] text-[1.15em] text-mute tabular">
          {snapshot.state === "PAUSED" ? "Paused" : `${last ? "Final results" : "Next question"} in ${left}s`}
        </p>
      </aside>
    </div>
  );
}

function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) return <p className="mt-[2vh] text-mute">No scores yet.</p>;
  return (
    <ol className="mt-[2vh] space-y-[1vh]">
      {entries.map((e) => (
        <li key={`${e.rank}-${e.name}`} className="flex items-center gap-4 rounded-[0.9vw] border border-line bg-night/80 px-[1vw] py-[1.1vh] animate-rise">
          <span className="w-[1.8em] font-display text-[1.3em] font-bold tabular text-flux">{e.rank}</span>
          <span className="min-w-0 flex-1 truncate text-[1.15em] font-semibold">{e.name}</span>
          <span className="font-display text-[1.1em] font-semibold tabular">{e.score.toLocaleString("en-IN")}</span>
        </li>
      ))}
    </ol>
  );
}

function FinalScreen({ snapshot }: { snapshot: PublicSnapshot }) {
  const board = snapshot.leaderboard ?? [];
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current || board.length === 0) return;
    fired.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void import("canvas-confetti").then(({ default: confetti }) => {
      const colors = ["#8b5cff", "#3d6bff", "#22d8f0", "#ffffff"];
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.35 }, colors, disableForReducedMotion: true });
      setTimeout(() => confetti({ particleCount: 90, angle: 60, spread: 70, origin: { x: 0, y: 0.6 }, colors }), 400);
      setTimeout(() => confetti({ particleCount: 90, angle: 120, spread: 70, origin: { x: 1, y: 0.6 }, colors }), 650);
    });
  }, [board.length]);

  const podium = [board[1], board[0], board[2]];
  const heights = ["h-[22vh]", "h-[30vh]", "h-[16vh]"];
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[1.5fr_1fr] gap-[4vw]">
      <div className="flex min-h-0 flex-col">
        <h1 className="font-display text-[clamp(2rem,3.6vw,4.4rem)] font-bold leading-tight">Final results</h1>
        <p className="mt-1 text-[1.2em] text-mute">{snapshot.title}</p>
        <div className="mt-auto grid grid-cols-3 items-end gap-[1.5vw]">
          {podium.map((entry, i) =>
            entry ? (
              <div key={entry.name} className="flex flex-col items-center text-center animate-rise" style={{ animationDelay: `${[300, 600, 0][i]}ms` }}>
                <p className="line-clamp-2 font-display text-[clamp(1rem,1.7vw,2.1rem)] font-bold leading-tight [overflow-wrap:anywhere]">{entry.name}</p>
                <p className="mt-1 text-[1.15em] text-mute tabular">{entry.score.toLocaleString("en-IN")} pts</p>
                <div
                  className={cn(
                    "mt-[1.5vh] flex w-full items-start justify-center rounded-t-[1.2vw] border border-b-0 pt-[1.5vh]",
                    heights[i],
                    entry.rank === 1 ? "brand-gradient border-transparent" : "border-line-strong bg-deep",
                  )}
                >
                  <span className="font-display text-[clamp(2rem,4vw,5rem)] font-bold leading-none">{entry.rank}</span>
                </div>
              </div>
            ) : (
              <div key={`empty-${i}`} />
            ),
          )}
        </div>
      </div>
      <aside className="flex min-h-0 flex-col justify-center border-l border-line pl-[3vw]">
        <Leaderboard entries={board.slice(3, 10)} />
        <div className="mt-[4vh] flex items-center gap-3 text-[0.95em] text-faint">
          <AllianceCrest className="size-[3.2vw] min-w-10" />
          <span>Hosted at Alliance University by the Infinity Club</span>
        </div>
      </aside>
    </div>
  );
}

function PausedOverlay() {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-ink/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <PauseCircle className="size-[6vw] min-w-16 text-warn" />
        <p className="font-display text-[clamp(2rem,4vw,5rem)] font-bold">Paused</p>
        <p className="text-[1.3em] text-mute">The timer is frozen for every team.</p>
      </div>
    </div>
  );
}
