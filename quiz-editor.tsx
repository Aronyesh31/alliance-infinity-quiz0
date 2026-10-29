"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  Copy,
  Eye,
  FileText,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { PageHeader } from "./shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/fields";
import { Badge, Panel, PanelHeader } from "@/components/ui/misc";
import { AnswerChoice } from "@/components/game/answer-choice";
import { api } from "@/lib/api-client";
import { cn, choiceLetter } from "@/lib/utils";
import {
  blankQuestion,
  TRUE_FALSE_CHOICES,
  validateQuizForPublish,
  type QuestionInput,
  type QuizInput,
  type QuizIssue,
} from "@/lib/validation/quiz";
import { parseTextQuiz } from "@/lib/import/text-quiz";
import {
  MAX_CHOICES,
  MAX_POINTS,
  MAX_QUESTIONS,
  MAX_TIME_LIMIT_SEC,
  MIN_CHOICES,
  MIN_TIME_LIMIT_SEC,
  QUESTION_TEXT_MAX,
  STANDARD_TIME_LIMIT_SEC,
} from "@/lib/config";

type EditorQuestion = QuestionInput & { key: string };
let keySeq = 0;
const withKey = (q: QuestionInput): EditorQuestion => ({ ...q, key: `q${++keySeq}` });

interface Props {
  quizId: string | null;
  initialStatus: "DRAFT" | "PUBLISHED";
  initial: QuizInput;
}

export function QuizEditor({ quizId, initialStatus, initial }: Props) {
  const router = useRouter();
  const [meta, setMeta] = useState({ title: initial.title, description: initial.description, timingMode: initial.timingMode, scoringMode: initial.scoringMode });
  const [questions, setQuestions] = useState<EditorQuestion[]>(() => initial.questions.map(withKey));
  const [status, setStatus] = useState(initialStatus);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState<null | "draft" | "publish">(null);
  const [notice, setNotice] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [serverIssues, setServerIssues] = useState<QuizIssue[] | null>(null);
  const [showIssues, setShowIssues] = useState(false);

  const quiz: QuizInput = useMemo(() => ({ ...meta, questions: questions.map(({ key: _k, ...q }) => q) }), [meta, questions]);
  const issues = useMemo(() => validateQuizForPublish(quiz), [quiz]);
  const visibleIssues = showIssues ? (serverIssues ?? issues) : [];

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const touch = () => {
    setDirty(true);
    setNotice(null);
    setServerIssues(null);
  };
  const updateQuestion = (index: number, patch: Partial<QuestionInput>) => {
    touch();
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };
  const move = (index: number, delta: number) => {
    touch();
    setQuestions((qs) => {
      const next = [...qs];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return next;
    });
  };

  const save = async (mode: "draft" | "publish") => {
    setSaving(mode);
    setNotice(null);
    if (mode === "publish" && issues.length > 0) {
      setShowIssues(true);
      setSaving(null);
      setNotice({ tone: "bad", text: `Fix ${issues.length === 1 ? "1 problem" : `${issues.length} problems`} before publishing.` });
      document.getElementById("issues")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const res = await api<{ id: string; status: "DRAFT" | "PUBLISHED" }>(quizId ? `/api/admin/quizzes/${quizId}` : "/api/admin/quizzes", {
      method: quizId ? "PUT" : "POST",
      body: { quiz, mode },
    });
    setSaving(null);
    if (!res.ok) {
      if (res.data.issues) {
        setServerIssues(res.data.issues);
        setShowIssues(true);
      }
      setNotice({ tone: "bad", text: res.data.message ?? "Couldn't save the quiz." });
      return;
    }
    setDirty(false);
    setStatus(res.data.status);
    setNotice({ tone: "good", text: mode === "publish" ? "Published. You can now create a game from this quiz." : "Draft saved." });
    if (!quizId) router.replace(`/admin/quizzes/${res.data.id}`);
    else router.refresh();
  };

  const issuesFor = (i: number) => visibleIssues.filter((x) => x.questionIndex === i);

  return (
    <div className="pb-28">
      <PageHeader
        title={meta.title.trim() || (quizId ? "Untitled quiz" : "New quiz")}
        description={
          <span className="flex items-center gap-3">
            <Badge tone={status === "PUBLISHED" ? "good" : "neutral"}>{status === "PUBLISHED" ? "Published" : "Draft"}</Badge>
            <span>{questions.length} questions</span>
            {dirty ? <span className="text-warn">Unsaved changes</span> : null}
          </span>
        }
        actions={<ImportDialog onImport={(parsed, title) => {
          touch();
          setQuestions((qs) => {
            // Drop untouched blank questions so an import into a new quiz starts clean.
            const keep = qs.filter((q) => q.text.trim() !== "" || (q.type === "MULTIPLE_CHOICE" && q.choices.some((c) => c.trim() !== "")));
            return [...keep, ...parsed.map(withKey)].slice(0, MAX_QUESTIONS);
          });
          if (title && !meta.title.trim()) setMeta((m) => ({ ...m, title }));
        }} />}
      />

      <div className="mx-auto grid max-w-4xl gap-6 px-5 py-6 sm:px-8">
        <Panel>
          <PanelHeader title="Quiz details" />
          <div className="grid gap-5 p-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={meta.title} maxLength={120} placeholder="e.g. Advanced Mathematics Round" onChange={(e) => { touch(); setMeta({ ...meta, title: e.target.value }); }} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Description (only you see this)</Label>
              <Textarea id="description" value={meta.description} maxLength={500} className="min-h-16" onChange={(e) => { touch(); setMeta({ ...meta, description: e.target.value }); }} />
            </div>
            <fieldset className="grid gap-3">
              <legend className="mb-2 text-[13px] font-medium text-mute">Timing</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <ChoiceCard
                  checked={meta.timingMode === "STANDARD"}
                  onSelect={() => { touch(); setMeta({ ...meta, timingMode: "STANDARD" }); }}
                  title="Standard event mode"
                  body="Every question lasts exactly 60 seconds."
                  name="timing"
                />
                <ChoiceCard
                  checked={meta.timingMode === "CUSTOM"}
                  onSelect={() => { touch(); setMeta({ ...meta, timingMode: "CUSTOM" }); }}
                  title="Custom timing"
                  body={`Set each question between ${MIN_TIME_LIMIT_SEC} and ${MAX_TIME_LIMIT_SEC} seconds.`}
                  name="timing"
                />
              </div>
            </fieldset>
            <fieldset className="grid gap-3">
              <legend className="mb-2 text-[13px] font-medium text-mute">Scoring</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <ChoiceCard
                  checked={meta.scoringMode === "SPEED"}
                  onSelect={() => { touch(); setMeta({ ...meta, scoringMode: "SPEED" }); }}
                  title="Speed and accuracy"
                  body="Correct answers earn 50–100% of the points; faster is higher."
                  name="scoring"
                />
                <ChoiceCard
                  checked={meta.scoringMode === "ACCURACY"}
                  onSelect={() => { touch(); setMeta({ ...meta, scoringMode: "ACCURACY" }); }}
                  title="Accuracy only"
                  body="Correct answers earn full points. Speed only breaks ties."
                  name="scoring"
                />
              </div>
            </fieldset>
          </div>
        </Panel>

        {visibleIssues.length > 0 ? (
          <div id="issues" className="scroll-mt-24 rounded-2xl border border-bad/40 bg-bad/[0.07] p-5" role="alert">
            <p className="flex items-center gap-2 font-semibold text-bad">
              <CircleAlert className="size-5" /> {visibleIssues.length === 1 ? "1 problem" : `${visibleIssues.length} problems`} to fix before publishing
            </p>
            <ul className="mt-3 space-y-1 text-[14px]">
              {visibleIssues.slice(0, 12).map((issue, i) => (
                <li key={i}>
                  {issue.questionIndex !== null ? (
                    <a href={`#question-${issue.questionIndex + 1}`} className="text-text underline-offset-4 hover:underline">
                      Question {issue.questionIndex + 1}
                    </a>
                  ) : (
                    <span className="text-text">Quiz</span>
                  )}
                  <span className="text-mute">: {issue.message}</span>
                </li>
              ))}
              {visibleIssues.length > 12 ? <li className="text-mute">…and {visibleIssues.length - 12} more.</li> : null}
            </ul>
          </div>
        ) : null}

        {questions.map((q, i) => (
          <QuestionCard
            key={q.key}
            index={i}
            total={questions.length}
            question={q}
            standard={meta.timingMode === "STANDARD"}
            issues={issuesFor(i)}
            onChange={(patch) => updateQuestion(i, patch)}
            onMove={(d) => move(i, d)}
            onDuplicate={() => {
              touch();
              setQuestions((qs) => [...qs.slice(0, i + 1), withKey({ ...qs[i] }), ...qs.slice(i + 1)].slice(0, MAX_QUESTIONS));
            }}
            onDelete={() => {
              touch();
              setQuestions((qs) => qs.filter((_, j) => j !== i));
            }}
          />
        ))}

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" disabled={questions.length >= MAX_QUESTIONS} onClick={() => { touch(); setQuestions((qs) => [...qs, withKey(blankQuestion())]); }}>
            <Plus /> Multiple choice
          </Button>
          <Button variant="secondary" disabled={questions.length >= MAX_QUESTIONS} onClick={() => { touch(); setQuestions((qs) => [...qs, withKey(blankQuestion("TRUE_FALSE"))]); }}>
            <Plus /> True or false
          </Button>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/90 backdrop-blur lg:left-[232px]">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 px-5 py-3 sm:px-8">
          <div className="min-w-0 flex-1 text-[14px]" aria-live="polite">
            {notice ? (
              <span className={notice.tone === "good" ? "text-good" : "text-bad"}>{notice.text}</span>
            ) : issues.length > 0 ? (
              <button className="text-mute hover:text-text" onClick={() => setShowIssues(true)}>
                {issues.length === 1 ? "1 thing" : `${issues.length} things`} to finish before publishing
              </button>
            ) : (
              <span className="text-mute">Ready to publish.</span>
            )}
          </div>
          <Button variant="secondary" disabled={saving !== null} onClick={() => save("draft")}>
            {saving === "draft" ? <Loader2 className="animate-spin" /> : null}
            {status === "PUBLISHED" ? "Return to draft" : "Save draft"}
          </Button>
          <Button disabled={saving !== null} onClick={() => save("publish")}>
            {saving === "publish" ? <Loader2 className="animate-spin" /> : <Upload />}
            {status === "PUBLISHED" ? "Save and keep published" : "Publish"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChoiceCard({ checked, onSelect, title, body, name }: { checked: boolean; onSelect: () => void; title: string; body: string; name: string }) {
  return (
    <label className={cn("flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors", checked ? "border-ion-soft/60 bg-ion/10" : "border-line hover:border-line-strong")}>
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="mt-1 accent-[var(--color-ion)]" />
      <span>
        <span className="block text-[14px] font-semibold">{title}</span>
        <span className="mt-0.5 block text-[13px] text-mute">{body}</span>
      </span>
    </label>
  );
}

function QuestionCard({
  index,
  total,
  question: q,
  standard,
  issues,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
}: {
  index: number;
  total: number;
  question: EditorQuestion;
  standard: boolean;
  issues: QuizIssue[];
  onChange: (patch: Partial<QuestionInput>) => void;
  onMove: (delta: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const has = (field: string) => issues.some((i) => i.field === field || i.field.startsWith(`${field}.`));
  const n = index + 1;

  const setType = (type: QuestionInput["type"]) => {
    if (type === q.type) return;
    if (type === "TRUE_FALSE") onChange({ type, choices: [...TRUE_FALSE_CHOICES], correctIndex: q.correctIndex <= 1 ? q.correctIndex : -1 });
    else onChange({ type, choices: ["", "", "", ""], correctIndex: -1 });
  };

  const upload = async (file: File) => {
    setUploading(true);
    setUploadError("");
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await fetch("/api/admin/images", { method: "POST", body, credentials: "same-origin" });
      const data = (await res.json()) as { ok?: boolean; id?: string; message?: string };
      if (res.ok && data.id) onChange({ imageId: data.id });
      else setUploadError(data.message ?? "Upload failed.");
    } catch {
      setUploadError("Upload failed. Check your connection.");
    }
    setUploading(false);
  };

  return (
    <Panel id={`question-${n}`} className={cn("scroll-mt-24", issues.length > 0 && "border-bad/40")}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
        <h2 className="mr-2 font-display text-[15px] font-semibold tabular">Question {n}</h2>
        <Select value={q.type} onChange={(e) => setType(e.target.value as QuestionInput["type"])} className="h-8 w-40 text-[13px]" aria-label={`Question ${n} type`}>
          <option value="MULTIPLE_CHOICE">Multiple choice</option>
          <option value="TRUE_FALSE">True or false</option>
        </Select>
        <div className="ml-auto flex items-center gap-0.5">
          <PreviewDialog question={q} index={index} total={total} />
          <Button variant="ghost" size="icon" aria-label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowUp />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Move down" disabled={index === total - 1} onClick={() => onMove(1)}>
            <ArrowDown />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Duplicate question" onClick={onDuplicate}>
            <Copy />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Delete question" onClick={onDelete} className="hover:text-bad">
            <Trash2 />
          </Button>
        </div>
      </div>

      <div className="grid gap-5 p-5">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <Label htmlFor={`text-${q.key}`}>Question</Label>
            <span className="text-[12px] text-faint tabular">
              {q.text.length}/{QUESTION_TEXT_MAX}
            </span>
          </div>
          <Textarea id={`text-${q.key}`} value={q.text} maxLength={QUESTION_TEXT_MAX} aria-invalid={has("text")} className="min-h-20 text-[16px]" onChange={(e) => onChange({ text: e.target.value })} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {q.imageId ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/images/${q.imageId}`} alt="" className="h-16 w-24 rounded-lg border border-line object-cover" />
              <Button variant="ghost" size="sm" onClick={() => onChange({ imageId: null })}>
                <X /> Remove image
              </Button>
            </div>
          ) : (
            <Button variant="secondary" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />} Add image
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
          <span className="text-[12px] text-faint">Optional. PNG, JPEG, WebP or GIF up to 2 MB.</span>
          <FieldError>{uploadError}</FieldError>
        </div>

        <fieldset className="grid gap-2.5">
          <legend className="mb-1 text-[13px] font-medium text-mute">Answers — select the correct one</legend>
          {q.choices.map((choice, ci) => (
            <div key={ci} className="flex items-center gap-3">
              <input
                type="radio"
                name={`correct-${q.key}`}
                checked={q.correctIndex === ci}
                onChange={() => onChange({ correctIndex: ci })}
                className="size-4 accent-[var(--color-good)]"
                aria-label={`Answer ${choiceLetter(ci)} is correct`}
              />
              <span className="w-5 font-display text-[14px] font-semibold text-mute">{choiceLetter(ci)}</span>
              {q.type === "TRUE_FALSE" ? (
                <span className="flex h-10 flex-1 items-center rounded-[10px] border border-line px-3.5 text-[15px]">{choice}</span>
              ) : (
                <Input
                  value={choice}
                  maxLength={160}
                  placeholder={`Answer ${choiceLetter(ci)}`}
                  aria-invalid={has(`choices.${ci}`)}
                  className="h-10"
                  onChange={(e) => onChange({ choices: q.choices.map((c, j) => (j === ci ? e.target.value : c)) })}
                />
              )}
              {q.type === "MULTIPLE_CHOICE" && q.choices.length > MIN_CHOICES ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove answer ${choiceLetter(ci)}`}
                  onClick={() =>
                    onChange({
                      choices: q.choices.filter((_, j) => j !== ci),
                      correctIndex: q.correctIndex === ci ? -1 : q.correctIndex > ci ? q.correctIndex - 1 : q.correctIndex,
                    })
                  }
                >
                  <X />
                </Button>
              ) : (
                <span className="w-9" />
              )}
            </div>
          ))}
          {q.type === "MULTIPLE_CHOICE" && q.choices.length < MAX_CHOICES ? (
            <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => onChange({ choices: [...q.choices, ""] })}>
              <Plus /> Add answer
            </Button>
          ) : null}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_2fr]">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`time-${q.key}`}>Time limit (s)</Label>
            <Input
              id={`time-${q.key}`}
              type="number"
              min={MIN_TIME_LIMIT_SEC}
              max={MAX_TIME_LIMIT_SEC}
              disabled={standard}
              value={standard ? STANDARD_TIME_LIMIT_SEC : q.timeLimitSec}
              aria-invalid={has("timeLimitSec")}
              onChange={(e) => onChange({ timeLimitSec: Number(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`pts-${q.key}`}>Points</Label>
            <Input id={`pts-${q.key}`} type="number" min={0} max={MAX_POINTS} step={50} value={q.points} aria-invalid={has("points")} onChange={(e) => onChange({ points: Number(e.target.value) })} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`exp-${q.key}`}>Explanation (shown after the deadline)</Label>
            <Input id={`exp-${q.key}`} value={q.explanation} maxLength={1000} placeholder="Optional" onChange={(e) => onChange({ explanation: e.target.value })} />
          </div>
        </div>

        {issues.length > 0 ? (
          <ul className="space-y-1 text-[13px] text-bad">
            {issues.map((issue, i) => (
              <li key={i}>{issue.message}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </Panel>
  );
}

function PreviewDialog({ question: q, index, total }: { question: QuestionInput; index: number; total: number }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Preview question">
          <Eye />
        </Button>
      </DialogTrigger>
      <DialogContent title={`Preview — question ${index + 1} of ${total}`} description="What a team sees on their phone. The correct answer is outlined here for you only." className="max-w-md">
        <div className="rounded-3xl border border-line bg-ink p-4">
          <div className="flex justify-between text-[13px] text-faint tabular">
            <span>{q.timeLimitSec}s</span>
            <span>{q.points} pts</span>
          </div>
          <p className="mt-3 text-[18px] font-semibold leading-snug">{q.text || "Question text"}</p>
          {q.imageId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/images/${q.imageId}`} alt="" className="mt-3 max-h-40 w-full rounded-xl object-contain" />
          ) : null}
          <div className="mt-4 grid gap-2">
            {q.choices.map((c, i) => (
              <AnswerChoice key={i} index={i} text={c || `Answer ${choiceLetter(i)}`} size="compact" tone={i === q.correctIndex ? "correct" : "idle"} />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({ onImport }: { onImport: (questions: QuestionInput[], title: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const parsed = useMemo(() => (text.trim() ? parseTextQuiz(text) : null), [text]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <FileText /> Import questions
      </Button>
      <DialogContent
        title="Import questions from text"
        description="Paste numbered questions with options A) to D), followed by an ANSWER KEY section (e.g. “1. B — explanation”)."
        className="max-w-2xl"
      >
        <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-64 font-mono text-[13px]" placeholder={"1. What is 2 + 2?\nA) 3\nB) 4\nC) 5\nD) 6\n\nANSWER KEY\n1. B — Two plus two is four."} />
        {parsed ? (
          <div className="mt-3 text-[14px]">
            <p className={parsed.questions.length ? "text-good" : "text-bad"}>
              Found {parsed.questions.length} question{parsed.questions.length === 1 ? "" : "s"}.
            </p>
            {parsed.warnings.length > 0 ? (
              <ul className="mt-2 max-h-28 space-y-0.5 overflow-y-auto text-[13px] text-warn">
                {parsed.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!parsed || parsed.questions.length === 0}
            onClick={() => {
              if (!parsed) return;
              onImport(parsed.questions, parsed.title);
              setText("");
              setOpen(false);
            }}
          >
            Add {parsed?.questions.length ?? 0} questions
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
