"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  ExternalLink,
  FileDown,
  Loader2,
  Pause,
  Play,
  Search,
  SkipForward,
  Square,
  UserMinus,
} from "lucide-react";
import { useGameConnection } from "@/lib/realtime/client";
import type { Ack, AdminCommand, AdminSnapshot, PublicSnapshot } from "@/lib/realtime/protocol";
import { formatPin } from "@/lib/game/pin";
import { InfinityTimer } from "@/components/game/infinity-timer";
import { AnswerChoice } from "@/components/game/answer-choice";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input, Label, Switch } from "@/components/ui/fields";
import { Badge, EmptyState, Panel, PanelHeader, StatusDot } from "@/components/ui/misc";
import { PageHeader } from "./shell";
import { api } from "@/lib/api-client";
import { cn, plural } from "@/lib/utils";

export interface ControlSession {
  id: string;
  title: string;
  pin: string;
  questionCount: number;
  capacity: number;
  revealSeconds: number;
  showTeamStanding: boolean;
  showAnswerFeedback: boolean;
  allowLateJoin: boolean;
}

const STATE_LABEL: Record<string, { label: string; tone: "neutral" | "ion" | "flux" | "good" | "warn" | "bad" }> = {
  LOBBY: { label: "Lobby", tone: "flux" },
  QUESTION: { label: "Question open", tone: "good" },
  REVEAL: { label: "Showing results", tone: "ion" },
  PAUSED: { label: "Paused", tone: "warn" },
  FINISHED: { label: "Finished", tone: "neutral" },
};

export function GameControl({ session, joinUrl, qr }: { session: ControlSession; joinUrl: string; qr: string }) {
  const { status, snapshot, admin, offsetMs, sendCommand } = useGameConnection({ role: "admin", sessionId: session.id });
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (command: AdminCommand, success: string) => {
    setBusy(command.type);
    setMessage(null);
    const res: Ack = await sendCommand(command);
    setBusy(null);
    setMessage(res.ok ? { tone: "good", text: success } : { tone: "bad", text: res.message });
  };

  const state = snapshot?.state ?? "LOBBY";
  const stateInfo = STATE_LABEL[state];

  return (
    <div>
      <PageHeader
        title={session.title}
        description={
          <span className="flex flex-wrap items-center gap-3">
            <span>
              PIN <span className="font-display font-semibold tabular text-text">{formatPin(session.pin)}</span>
            </span>
            <Badge tone={stateInfo.tone}>{stateInfo.label}</Badge>
            <ConnectionBadge status={status} admin={admin} />
          </span>
        }
        actions={
          <>
            <Button asChild variant="secondary">
              <a href={`/present/${session.id}`} target="_blank" rel="noopener">
                <ExternalLink /> Presentation screen
              </a>
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/admin/results/${session.id}`}>Results</Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-night/60 px-5 py-4 sm:px-8">
        {state === "LOBBY" ? (
          <Button size="lg" disabled={!snapshot || busy !== null || (snapshot?.teamCount ?? 0) === 0} onClick={() => run({ type: "start" }, "Game started.")}>
            {busy === "start" ? <Loader2 className="animate-spin" /> : <Play />} Start game
          </Button>
        ) : null}
        {state === "QUESTION" ? (
          <ConfirmDialog
            trigger={
              <Button variant="secondary" size="lg" disabled={busy !== null}>
                <SkipForward /> End question now
              </Button>
            }
            title="End this question for everyone?"
            description="Answers stop immediately for every team and the results are shown. Teams that haven't answered score zero."
            confirmLabel="End question"
            tone="primary"
            onConfirm={() => run({ type: "endQuestion" }, "Question ended.")}
          />
        ) : null}
        {state === "QUESTION" || state === "REVEAL" ? (
          <Button variant="secondary" size="lg" disabled={busy !== null} onClick={() => run({ type: "pause" }, "Paused. The timer is frozen for every team.")}>
            <Pause /> Pause
          </Button>
        ) : null}
        {state === "PAUSED" ? (
          <Button size="lg" disabled={busy !== null} onClick={() => run({ type: "resume" }, "Resumed.")}>
            <Play /> Resume
          </Button>
        ) : null}
        {snapshot && state !== "FINISHED" ? (
          <label className="ml-1 flex items-center gap-2.5 text-[14px] text-mute">
            <Switch
              checked={snapshot.registrationOpen}
              disabled={busy !== null || (state !== "LOBBY" && !session.allowLateJoin)}
              onCheckedChange={(open) => run({ type: "setRegistration", open }, open ? "Registration opened." : "Registration closed.")}
              aria-label="Registration open"
            />
            Registration {snapshot.registrationOpen ? "open" : "closed"}
          </label>
        ) : null}
        <div className="ml-auto flex gap-2">
          {state === "FINISHED" ? (
            <Button asChild variant="secondary">
              <a href={`/api/admin/sessions/${session.id}/export?kind=rankings`}>
                <FileDown /> Export rankings CSV
              </a>
            </Button>
          ) : (
            <ConfirmDialog
              trigger={
                <Button variant="dangerOutline" disabled={!snapshot || busy !== null}>
                  <Square /> End game
                </Button>
              }
              title="End the whole game?"
              description="The competition stops now and final rankings are saved. Remaining questions will not be played. This cannot be undone."
              confirmLabel="End game"
              onConfirm={() => run({ type: "endGame" }, "Game ended. Final rankings saved.")}
            />
          )}
        </div>
        <div className="w-full text-[14px]" aria-live="polite">
          {message ? <p className={message.tone === "good" ? "text-good" : "text-bad"}>{message.text}</p> : null}
        </div>
      </div>

      <div className="grid gap-6 px-5 py-6 sm:px-8 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          {!snapshot ? (
            <Panel>
              <EmptyState title={status === "unauthorized" ? "Your admin session expired" : "Connecting to the realtime server…"}>
                {status === "unauthorized" ? "Sign in again to control the game." : "If this doesn't clear in a few seconds, check that the realtime server is running."}
              </EmptyState>
            </Panel>
          ) : state === "LOBBY" ? (
            <>
              <JoinPanel pin={session.pin} joinUrl={joinUrl} qr={qr} teamCount={snapshot.teamCount} capacity={session.capacity} />
              <SettingsPanel session={session} />
            </>
          ) : (
            <LivePanel snapshot={snapshot} admin={admin} offsetMs={offsetMs} />
          )}
          {admin ? <EventLog admin={admin} /> : null}
        </div>
        <TeamsPanel snapshot={snapshot} admin={admin} onRemove={(id, name) => run({ type: "removeTeam", teamId: id }, `Removed "${name}".`)} />
      </div>
    </div>
  );
}

function ConnectionBadge({ status, admin }: { status: string; admin: AdminSnapshot | null }) {
  if (status === "connected") {
    const failed = admin?.health.failedWrites ?? 0;
    return (
      <span className="inline-flex items-center gap-2 text-[13px]">
        <StatusDot tone={failed > 0 ? "warn" : "good"} />
        {failed > 0 ? `Live, ${failed} failed database writes` : "Live"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-warn">
      <StatusDot tone={status === "unauthorized" ? "bad" : "warn"} />
      {status === "unauthorized" ? "Signed out" : "Reconnecting to realtime server"}
    </span>
  );
}

function JoinPanel({ pin, joinUrl, qr, teamCount, capacity }: { pin: string; joinUrl: string; qr: string; teamCount: number; capacity: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <Panel>
      <PanelHeader title="Joining" description="Show the presentation screen on the projector so teams can scan the code." />
      <div className="grid gap-6 p-5 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <p className="text-[13px] text-mute">Game PIN</p>
          <p data-testid="game-pin" className="font-display text-[44px] font-bold leading-none tracking-[0.04em] tabular">{formatPin(pin)}</p>
          <p className="mt-5 text-[13px] text-mute">Join link</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="min-w-0 truncate rounded-lg border border-line bg-ink px-3 py-2 text-[13px]">{joinUrl}</code>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Copy join link"
              onClick={async () => {
                await navigator.clipboard.writeText(joinUrl).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
          <p className="mt-5 text-[14px] text-mute tabular">
            {plural(teamCount, "team")} joined of {capacity} places
          </p>
        </div>
        <div className="size-40 overflow-hidden rounded-xl bg-white p-1.5 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} />
      </div>
    </Panel>
  );
}

function SettingsPanel({ session }: { session: ControlSession }) {
  const [values, setValues] = useState({
    capacity: session.capacity,
    revealSeconds: session.revealSeconds,
    showTeamStanding: session.showTeamStanding,
    showAnswerFeedback: session.showAnswerFeedback,
    allowLateJoin: session.allowLateJoin,
  });
  const [note, setNote] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const toggles: { key: "showAnswerFeedback" | "showTeamStanding" | "allowLateJoin"; label: string; help: string }[] = [
    { key: "showAnswerFeedback", label: "Show teams whether they were right", help: "After each deadline, each phone shows correct or incorrect." },
    { key: "showTeamStanding", label: "Show teams their own rank and score", help: "Teams only ever see their own standing." },
    { key: "allowLateJoin", label: "Allow joining after the start", help: "Late teams score zero for questions they missed." },
  ];
  return (
    <Panel>
      <PanelHeader title="Game settings" description="Locked once the game starts, so the rules can't change mid-competition." />
      <form
        className="grid gap-5 p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          const res = await api(`/api/admin/sessions/${session.id}`, { method: "PATCH", body: { settings: values } });
          setSaving(false);
          setNote(res.ok ? { tone: "good", text: "Settings saved." } : { tone: "bad", text: res.data.message ?? "Couldn't save settings." });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="capacity">Team capacity</Label>
            <Input id="capacity" type="number" min={1} max={2000} value={values.capacity} onChange={(e) => setValues({ ...values, capacity: Number(e.target.value) })} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reveal">Results shown for (seconds)</Label>
            <Input id="reveal" type="number" min={0} max={30} value={values.revealSeconds} onChange={(e) => setValues({ ...values, revealSeconds: Number(e.target.value) })} />
          </div>
        </div>
        {toggles.map((t) => (
          <label key={t.key} className="flex items-start justify-between gap-4">
            <span>
              <span className="block text-[14px] font-medium">{t.label}</span>
              <span className="block text-[13px] text-mute">{t.help}</span>
            </span>
            <Switch checked={values[t.key]} onCheckedChange={(v) => setValues({ ...values, [t.key]: v })} />
          </label>
        ))}
        <div className="flex items-center gap-4">
          <Button type="submit" variant="secondary" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : null} Save settings
          </Button>
          {note ? <p className={cn("text-[14px]", note.tone === "good" ? "text-good" : "text-bad")}>{note.text}</p> : null}
        </div>
      </form>
    </Panel>
  );
}

function LivePanel({ snapshot, admin, offsetMs }: { snapshot: PublicSnapshot; admin: AdminSnapshot | null; offsetMs: number }) {
  const q = snapshot.question;
  if (snapshot.state === "FINISHED") {
    return (
      <Panel>
        <PanelHeader title="Final standings" description="Saved. Export the full rankings from the Results page." />
        <ol className="divide-y divide-line">
          {(snapshot.leaderboard ?? []).map((e) => (
            <li key={`${e.rank}-${e.name}`} className="flex items-center gap-4 px-5 py-3">
              <span className="w-8 font-display font-semibold tabular text-flux">{e.rank}</span>
              <span className="flex-1 truncate font-medium">{e.name}</span>
              <span className="tabular text-mute">{e.correctCount} correct</span>
              <span className="w-20 text-right font-display font-semibold tabular">{e.score.toLocaleString("en-IN")}</span>
            </li>
          ))}
        </ol>
      </Panel>
    );
  }
  if (!q) return null;
  const correct = admin?.currentCorrectIndex ?? null;
  const distribution = admin?.distribution ?? snapshot.reveal?.distribution ?? [];
  const answered = admin?.answeredCount ?? snapshot.answeredCount;
  const total = Math.max(1, answered);
  const paused = snapshot.state === "PAUSED";
  const inQuestion = snapshot.state === "QUESTION" || (paused && snapshot.pausedFrom === "QUESTION");
  return (
    <Panel>
      <PanelHeader
        title={`Question ${snapshot.currentIndex + 1} of ${snapshot.questionCount}`}
        description={inQuestion ? "Answers open — the next step happens automatically at zero." : "Results on screen — the next question opens automatically."}
        action={
          inQuestion ? (
            <InfinityTimer
              deadline={snapshot.deadline}
              totalMs={q.timeLimitSec * 1000}
              offsetMs={offsetMs}
              frozenMs={paused ? snapshot.pausedRemainingMs : null}
              layout="inline"
              numberClassName="text-[24px]"
            />
          ) : (
            <RevealCountdown at={paused ? null : snapshot.revealEndsAt} offsetMs={offsetMs} />
          )
        }
      />
      <div className="p-5">
        <p className="text-[18px] font-semibold leading-snug">{q.text}</p>
        <div className="mt-5 space-y-2.5">
          {q.choices.map((c, i) => (
            <AnswerChoice key={i} index={i} text={c} size="compact" tone={i === correct ? "correct" : "idle"} share={(distribution[i] ?? 0) / total} count={distribution[i] ?? 0} />
          ))}
        </div>
        <div className="mt-5">
          <div className="flex justify-between text-[13px] text-mute tabular">
            <span>{plural(answered, "team")} answered</span>
            <span>{snapshot.teamCount} in game</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-raise">
            <div className="brand-gradient h-full transition-[width] duration-500" style={{ width: `${Math.round((answered / Math.max(1, snapshot.teamCount)) * 100)}%` }} />
          </div>
        </div>
        <p className="mt-4 text-[12px] text-faint">The correct answer is highlighted here for you only. Teams and the projector see it after the deadline.</p>
      </div>
    </Panel>
  );
}

function RevealCountdown({ at, offsetMs }: { at: number | null; offsetMs: number }) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (at === null) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((at - (Date.now() + offsetMs)) / 1000)));
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [at, offsetMs]);
  if (at === null) return <span className="text-[14px] text-warn">Paused</span>;
  return <span className="text-[14px] text-mute tabular">Next in {left}s</span>;
}

function TeamsPanel({ snapshot, admin, onRemove }: { snapshot: PublicSnapshot | null; admin: AdminSnapshot | null; onRemove: (id: string, name: string) => Promise<void> }) {
  const [query, setQuery] = useState("");
  const teams = admin?.teams ?? [];
  const filtered = query.trim() ? teams.filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase())) : teams;
  const inQuestion = snapshot?.state === "QUESTION" || (snapshot?.state === "PAUSED" && snapshot.pausedFrom === "QUESTION");
  return (
    <Panel className="flex max-h-[calc(100dvh-8rem)] min-w-0 flex-col xl:sticky xl:top-6">
      <PanelHeader
        title="Teams"
        description={
          admin ? (
            <span className="tabular">
              {teams.length} registered, {admin.connectedCount} connected{inQuestion ? `, ${admin.answeredCount} answered` : ""}
            </span>
          ) : (
            "Waiting for live data…"
          )
        }
      />
      <div className="border-b border-line p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input placeholder="Find a team" value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 pl-9 text-[14px]" aria-label="Find a team" />
        </div>
      </div>
      {filtered.length === 0 ? (
        <EmptyState title={teams.length === 0 ? "No teams yet" : "No matching teams"}>
          {teams.length === 0 ? "Teams appear here the moment they join." : null}
        </EmptyState>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
          {filtered.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
              <span title={t.connected ? "Connected" : "Not connected"}>
                <StatusDot tone={t.connected ? "good" : "idle"} />
              </span>
              <span className="w-8 shrink-0 text-[13px] text-faint tabular">#{t.rank}</span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{t.name}</span>
              {inQuestion ? (
                <span className={cn("text-[12px]", t.answeredCurrent ? "text-good" : "text-faint")}>{t.answeredCurrent ? "Answered" : "Waiting"}</span>
              ) : null}
              <span className="w-16 text-right font-display text-[13px] font-semibold tabular">{t.score.toLocaleString("en-IN")}</span>
              <ConfirmDialog
                  trigger={
                    <button className="rounded-md p-1.5 text-faint hover:bg-bad/10 hover:text-bad" aria-label={`Remove ${t.name}`}>
                      <UserMinus className="size-4" />
                    </button>
                  }
                  title={`Remove "${t.name}"?`}
                  description="The team is disconnected, can't rejoin under this name, and is left out of the rankings."
                  confirmLabel="Remove team"
                  onConfirm={() => onRemove(t.id, t.name)}
                />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function EventLog({ admin }: { admin: AdminSnapshot }) {
  const events = [...admin.events].reverse();
  return (
    <Panel>
      <PanelHeader
        title="Activity"
        description={
          <span className="tabular">
            Server up {Math.floor(admin.health.uptimeSec / 60)} min, {admin.health.sockets} open connections
            {admin.health.lastDbWriteMs !== null ? `, last database write ${admin.health.lastDbWriteMs} ms` : ""}
          </span>
        }
      />
      <ol className="max-h-72 divide-y divide-line overflow-y-auto text-[13px]">
        {events.length === 0 ? <li className="px-5 py-4 text-mute">Nothing yet.</li> : null}
        {events.map((e, i) => (
          <li key={`${e.at}-${i}`} className="flex gap-4 px-5 py-2.5">
            <time className="shrink-0 text-faint tabular">{new Date(e.at).toLocaleTimeString("en-IN", { hour12: false })}</time>
            <span className={cn(e.level === "error" ? "text-bad" : e.level === "warn" ? "text-warn" : "text-mute")}>{e.message}</span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
