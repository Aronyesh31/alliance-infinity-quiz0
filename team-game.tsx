"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleSlash, Loader2, PauseCircle, Trophy, WifiOff, XCircle } from "lucide-react";
import { useGameConnection } from "@/lib/realtime/client";
import type { PublicSnapshot, TeamSelf } from "@/lib/realtime/protocol";
import { InfinityMark } from "@/components/brand/logo";
import { InfinityBackdrop } from "@/components/brand/infinity-backdrop";
import { Button } from "@/components/ui/button";
import { AnswerChoice, type ChoiceTone } from "./answer-choice";
import { InfinityTimer } from "./infinity-timer";
import { cn, choiceLetter, plural } from "@/lib/utils";

const FINAL_ERRORS = new Set(["closed", "too_late", "wrong_question", "removed", "invalid_choice"]);

export function TeamGame({ sessionId, teamName }: { sessionId: string; teamName: string }) {
  const { status, snapshot, self, offsetMs, submitAnswer } = useGameConnection({ role: "team", sessionId });

  if (status === "removed") {
    return (
      <Notice title="Your team was removed from this game" icon={<CircleSlash className="size-10 text-bad" />}>
        If you think this is a mistake, speak to the host.
      </Notice>
    );
  }
  if (status === "superseded") {
    return (
      <Notice title="Your team is playing on another tab or device" icon={<CircleSlash className="size-10 text-warn" />}>
        Each team plays on one device. To play here instead, reload this page.
        <Button className="mt-6 w-full" size="lg" onClick={() => window.location.reload()}>
          Play on this device
        </Button>
      </Notice>
    );
  }
  if (status === "unauthorized" || status === "missing") {
    return (
      <Notice title={status === "missing" ? "This game no longer exists" : "This device isn’t part of a game"} icon={<CircleSlash className="size-10 text-mute" />}>
        <Button asChild className="mt-6 w-full" size="lg">
          <Link href="/join">Join with a game PIN</Link>
        </Button>
      </Notice>
    );
  }
  if (!snapshot) {
    return (
      <Notice title="Connecting to the game…" icon={<Loader2 className="size-10 animate-spin text-ion-soft" />}>
        Keep this page open.
      </Notice>
    );
  }

  return (
    <div className="field flex min-h-dvh flex-col">
      <TeamHeader snapshot={snapshot} teamName={self?.name || teamName} />
      {status !== "connected" ? (
        <div className="flex items-center justify-center gap-2 bg-warn/15 px-4 py-2 text-[13px] font-medium text-warn" role="status">
          <WifiOff className="size-4" /> Reconnecting… your submitted answers are safe.
        </div>
      ) : null}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-8 pt-4 sm:px-6">
        <Stage snapshot={snapshot} self={self} offsetMs={offsetMs} submitAnswer={submitAnswer} connected={status === "connected"} />
      </main>
    </div>
  );
}

function TeamHeader({ snapshot, teamName }: { snapshot: PublicSnapshot; teamName: string }) {
  const inGame = snapshot.currentIndex >= 0 && snapshot.state !== "LOBBY";
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-ink/85 px-4 py-3 backdrop-blur-md">
      <InfinityMark className="h-6 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold" title={teamName}>
        {teamName}
      </span>
      {inGame && snapshot.state !== "FINISHED" ? (
        <span className="shrink-0 rounded-full border border-line-strong px-2.5 py-1 font-display text-[12px] font-medium tabular text-mute">
          Q {snapshot.currentIndex + 1}/{snapshot.questionCount}
        </span>
      ) : null}
    </header>
  );
}

type Submit = ReturnType<typeof useGameConnection>["submitAnswer"];

function Stage({ snapshot, self, offsetMs, submitAnswer, connected }: { snapshot: PublicSnapshot; self: TeamSelf | null; offsetMs: number; submitAnswer: Submit; connected: boolean }) {
  switch (snapshot.state) {
    case "LOBBY":
      return <Lobby snapshot={snapshot} teamName={self?.name ?? ""} />;
    case "QUESTION":
      return <QuestionView key={snapshot.currentIndex} snapshot={snapshot} self={self} offsetMs={offsetMs} submitAnswer={submitAnswer} connected={connected} />;
    case "PAUSED":
      return snapshot.pausedFrom === "QUESTION" ? (
        <QuestionView key={snapshot.currentIndex} snapshot={snapshot} self={self} offsetMs={offsetMs} submitAnswer={submitAnswer} connected={connected} />
      ) : (
        <RevealView snapshot={snapshot} self={self} offsetMs={offsetMs} />
      );
    case "REVEAL":
      return <RevealView snapshot={snapshot} self={self} offsetMs={offsetMs} />;
    case "FINISHED":
      return <FinishedView snapshot={snapshot} self={self} />;
  }
}

function Lobby({ snapshot, teamName }: { snapshot: PublicSnapshot; teamName: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center animate-rise">
      <InfinityBackdrop className="w-64 max-w-full" />
      <p className="mt-6 text-[15px] text-good">You’re in.</p>
      <h1 className="mt-2 font-display text-[clamp(1.6rem,7vw,2.4rem)] font-bold leading-tight [overflow-wrap:anywhere]">{teamName}</h1>
      <p className="mt-4 max-w-xs text-[16px] text-mute">Waiting for the host to start {snapshot.title}.</p>
      <p className="mt-8 text-[14px] text-faint tabular">{plural(snapshot.teamCount, "team")} in the lobby</p>
      <ul className="mt-8 max-w-sm space-y-2 text-left text-[14px] text-mute">
        <li>{snapshot.questionCount} questions, each open for a fixed time.</li>
        <li>Tap once to answer — your choice locks immediately.</li>
        <li>Keep this screen on. It moves to each question automatically.</li>
      </ul>
    </div>
  );
}

function useServerExpired(deadline: number | null, offsetMs: number) {
  const [expired, setExpired] = useState(() => deadline !== null && Date.now() + offsetMs >= deadline);
  useEffect(() => {
    if (deadline === null) return;
    const left = deadline - (Date.now() + offsetMs);
    if (left <= 0) {
      setExpired(true);
      return;
    }
    setExpired(false);
    const t = setTimeout(() => setExpired(true), left);
    return () => clearTimeout(t);
  }, [deadline, offsetMs]);
  return expired;
}

function QuestionView({ snapshot, self, offsetMs, submitAnswer, connected }: { snapshot: PublicSnapshot; self: TeamSelf | null; offsetMs: number; submitAnswer: Submit; connected: boolean }) {
  const q = snapshot.question!;
  const paused = snapshot.state === "PAUSED";
  const expired = useServerExpired(paused ? null : snapshot.deadline, offsetMs);
  const [pending, setPending] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sending = useRef(false);

  const serverAnswer = self?.answer && self.answer.questionIndex === q.index ? self.answer.choiceIndex : null;
  const chosen = serverAnswer ?? confirmed ?? pending;
  const locked = chosen !== null;
  const open = snapshot.state === "QUESTION" && !expired;

  const choose = useCallback(
    async (choiceIndex: number) => {
      if (sending.current || locked || !open) return;
      sending.current = true;
      setPending(choiceIndex);
      setError(null);
      navigator.vibrate?.(12);
      for (let attempt = 0; attempt < 4; attempt++) {
        const res = await submitAnswer(q.index, choiceIndex);
        if (res.ok) {
          setConfirmed(res.choiceIndex);
          setPending(null);
          sending.current = false;
          return;
        }
        if (FINAL_ERRORS.has(res.code)) {
          setPending(null);
          setError(res.message);
          sending.current = false;
          return;
        }
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
        if (snapshot.deadline !== null && Date.now() + offsetMs > snapshot.deadline) break;
      }
      setPending(null);
      setError("Your answer didn’t reach the server. Tap your answer again.");
      sending.current = false;
    },
    [locked, open, submitAnswer, q.index, snapshot.deadline, offsetMs],
  );

  const toneFor = (i: number): ChoiceTone => {
    if (chosen === null) return open ? "idle" : "faded";
    return i === chosen ? "selected" : "dimmed";
  };

  return (
    <div className="flex flex-1 flex-col animate-rise">
      <div className="flex items-center justify-between gap-4">
        <InfinityTimer
          deadline={snapshot.deadline}
          totalMs={q.timeLimitSec * 1000}
          offsetMs={offsetMs}
          frozenMs={paused ? snapshot.pausedRemainingMs : null}
          layout="inline"
          numberClassName="text-[28px]"
        />
        <span className="text-[13px] text-faint tabular">{q.points.toLocaleString("en-IN")} pts</span>
      </div>

      <h1 className="mt-5 text-[clamp(1.25rem,5.2vw,1.9rem)] font-semibold leading-[1.3] [overflow-wrap:anywhere]">{q.text}</h1>
      {q.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={q.imageUrl} alt="" className="mt-4 max-h-56 w-full rounded-2xl border border-line object-contain bg-night" />
      ) : null}

      <div className={cn("mt-6 grid gap-3", q.choices.length > 2 ? "sm:grid-cols-2" : "grid-cols-1")}>
        {q.choices.map((choice, i) => (
          <AnswerChoice
            key={i}
            as="button"
            index={i}
            text={choice}
            tone={toneFor(i)}
            disabled={locked || !open || !connected}
            onClick={() => void choose(i)}
          />
        ))}
      </div>

      <div className="mt-6 min-h-16" aria-live="polite">
        {paused ? (
          <StatusLine icon={<PauseCircle className="size-6 text-warn" />} title="Paused by the host" body="The timer is frozen. Hold on." />
        ) : pending !== null && serverAnswer === null && confirmed === null ? (
          <StatusLine icon={<Loader2 className="size-6 animate-spin text-ion-soft" />} title="Sending your answer…" />
        ) : locked ? (
          <StatusLine
            icon={<CheckCircle2 className="size-6 text-good" />}
            title="Answer submitted"
            body={`You chose ${choiceLetter(chosen!)}. It’s locked in — wait for the timer.`}
          />
        ) : !open ? (
          <StatusLine icon={<XCircle className="size-6 text-mute" />} title="Time’s up" body="No answer was recorded for this question." />
        ) : error ? (
          <StatusLine icon={<XCircle className="size-6 text-bad" />} title={error} />
        ) : (
          <p className="text-center text-[14px] text-faint">Tap one answer. You can’t change it afterwards.</p>
        )}
      </div>
    </div>
  );
}

function StatusLine({ icon, title, body }: { icon: React.ReactNode; title: string; body?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-line bg-night/80 p-4" role="status">
      {icon}
      <div>
        <p className="text-[16px] font-semibold">{title}</p>
        {body ? <p className="mt-0.5 text-[14px] text-mute">{body}</p> : null}
      </div>
    </div>
  );
}

function NextIn({ at, offsetMs, label }: { at: number | null; offsetMs: number; label: string }) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (at === null) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((at - (Date.now() + offsetMs)) / 1000)));
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [at, offsetMs]);
  if (at === null) return null;
  return (
    <p className="text-center text-[14px] text-faint tabular">
      {label} {left > 0 ? `in ${left}s` : "now"}
    </p>
  );
}

function RevealView({ snapshot, self, offsetMs }: { snapshot: PublicSnapshot; self: TeamSelf | null; offsetMs: number }) {
  const q = snapshot.question;
  const reveal = snapshot.reveal;
  const result = self?.result && reveal && self.result.questionIndex === reveal.questionIndex ? self.result : null;
  const myChoice = self?.answer && q && self.answer.questionIndex === q.index ? self.answer.choiceIndex : null;
  const last = snapshot.currentIndex + 1 >= snapshot.questionCount;

  return (
    <div className="flex flex-1 flex-col animate-rise">
      {result ? (
        <div
          className={cn(
            "rounded-3xl border p-6 text-center",
            result.isCorrect ? "border-good/40 bg-good/10" : result.answered ? "border-bad/40 bg-bad/10" : "border-line bg-night/80",
          )}
        >
          {result.isCorrect ? (
            <CheckCircle2 className="mx-auto size-12 text-good" />
          ) : result.answered ? (
            <XCircle className="mx-auto size-12 text-bad" />
          ) : (
            <CircleSlash className="mx-auto size-12 text-mute" />
          )}
          <p className="mt-3 font-display text-[28px] font-bold">
            {result.isCorrect ? "Correct" : result.answered ? "Not this time" : "No answer"}
          </p>
          <p className="mt-1 text-[17px] text-mute tabular">+{result.points.toLocaleString("en-IN")} points</p>
        </div>
      ) : (
        <div className="rounded-3xl border border-line bg-night/80 p-6 text-center">
          <p className="font-display text-[22px] font-bold">Answers are in</p>
          <p className="mt-1 text-[15px] text-mute">Look at the big screen for the results.</p>
        </div>
      )}

      {snapshot.showAnswerFeedback && q && reveal ? (
        <div className="mt-6 space-y-2.5">
          {q.choices.map((choice, i) => (
            <AnswerChoice
              key={i}
              index={i}
              text={choice}
              size="compact"
              tone={i === reveal.correctIndex ? "correct" : i === myChoice ? "wrong" : "faded"}
            />
          ))}
          {reveal.explanation ? <p className="pt-2 text-[14px] leading-relaxed text-mute">{reveal.explanation}</p> : null}
        </div>
      ) : null}

      {self?.standing ? <Standing standing={self.standing} /> : null}

      <div className="mt-auto pt-8">
        {snapshot.state === "PAUSED" ? (
          <StatusLine icon={<PauseCircle className="size-6 text-warn" />} title="Paused by the host" />
        ) : (
          <NextIn at={snapshot.revealEndsAt} offsetMs={offsetMs} label={last ? "Final results" : "Next question"} />
        )}
      </div>
    </div>
  );
}

function Standing({ standing }: { standing: NonNullable<TeamSelf["standing"]> }) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line text-center">
      <div className="bg-night/95 p-4">
        <p className="text-[13px] text-mute">Rank</p>
        <p className="mt-1 font-display text-[24px] font-bold tabular">
          {standing.rank}
          <span className="text-[14px] font-medium text-faint"> / {standing.of}</span>
        </p>
      </div>
      <div className="bg-night/95 p-4">
        <p className="text-[13px] text-mute">Score</p>
        <p className="mt-1 font-display text-[24px] font-bold tabular">{standing.score.toLocaleString("en-IN")}</p>
      </div>
    </div>
  );
}

function FinishedView({ snapshot, self }: { snapshot: PublicSnapshot; self: TeamSelf | null }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center animate-rise">
      <Trophy className="size-14 text-flux" />
      <h1 className="mt-4 font-display text-[30px] font-bold">That’s a wrap</h1>
      <p className="mt-2 max-w-xs text-[16px] text-mute">Thanks for playing {snapshot.title}. The winners are on the big screen.</p>
      {self?.standing ? (
        <div className="mt-8 w-full max-w-sm">
          <Standing standing={self.standing} />
          <p className="mt-3 text-[14px] text-mute tabular">{plural(self.standing.correctCount, "correct answer")}</p>
        </div>
      ) : null}
      <Button asChild variant="ghost" className="mt-10">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}

function Notice({ title, icon, children }: { title: string; icon: React.ReactNode; children?: React.ReactNode }) {
  return (
    <main className="field flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm text-center animate-rise">
        <div className="flex justify-center">{icon}</div>
        <h1 className="mt-5 font-display text-[22px] font-bold leading-snug">{title}</h1>
        {children ? <div className="mt-3 text-[15px] text-mute">{children}</div> : null}
      </div>
    </main>
  );
}
