"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select, Switch } from "@/components/ui/fields";
import { api } from "@/lib/api-client";
import { DEFAULT_CAPACITY, DEFAULT_REVEAL_SECONDS } from "@/lib/config";

export function NewGameForm({ quizzes }: { quizzes: { id: string; title: string; questions: number; standard: boolean }[] }) {
  const router = useRouter();
  const [quizId, setQuizId] = useState(quizzes[0]?.id ?? "");
  const [capacity, setCapacity] = useState(DEFAULT_CAPACITY);
  const [revealSeconds, setRevealSeconds] = useState(DEFAULT_REVEAL_SECONDS);
  const [showAnswerFeedback, setFeedback] = useState(true);
  const [showTeamStanding, setStanding] = useState(true);
  const [allowLateJoin, setLateJoin] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = quizzes.find((q) => q.id === quizId);

  return (
    <form
      className="grid gap-5 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const res = await api<{ id: string }>("/api/admin/sessions", {
          body: { quizId, settings: { capacity, revealSeconds, showAnswerFeedback, showTeamStanding, allowLateJoin } },
        });
        if (res.ok) {
          router.push(`/admin/games/${res.data.id}`);
          return;
        }
        setError(res.data.message ?? "Couldn't create the game.");
        setBusy(false);
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="quiz">Quiz</Label>
        <Select id="quiz" value={quizId} onChange={(e) => setQuizId(e.target.value)}>
          {quizzes.map((q) => (
            <option key={q.id} value={q.id}>
              {q.title} ({q.questions} questions)
            </option>
          ))}
        </Select>
        {selected ? (
          <p className="text-[13px] text-faint">
            {selected.standard ? "Standard event mode: every question lasts exactly 60 seconds." : "Custom timing: each question uses its own time limit."}
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="cap">Team capacity</Label>
          <Input id="cap" type="number" min={1} max={2000} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="rev">Results shown (s)</Label>
          <Input id="rev" type="number" min={0} max={30} value={revealSeconds} onChange={(e) => setRevealSeconds(Number(e.target.value))} />
        </div>
      </div>
      <label className="flex items-center justify-between gap-4 text-[14px]">
        Show teams whether they were right
        <Switch checked={showAnswerFeedback} onCheckedChange={setFeedback} />
      </label>
      <label className="flex items-center justify-between gap-4 text-[14px]">
        Show teams their own rank and score
        <Switch checked={showTeamStanding} onCheckedChange={setStanding} />
      </label>
      <label className="flex items-center justify-between gap-4 text-[14px]">
        Allow joining after the start
        <Switch checked={allowLateJoin} onCheckedChange={setLateJoin} />
      </label>
      <FieldError>{error}</FieldError>
      <Button type="submit" disabled={busy || !quizId}>
        {busy ? <Loader2 className="animate-spin" /> : null} Create game and open registration
      </Button>
    </form>
  );
}
