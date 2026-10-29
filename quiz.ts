import { z } from "zod";
import {
  CHOICE_TEXT_MAX,
  DEFAULT_POINTS,
  EXPLANATION_MAX,
  MAX_CHOICES,
  MAX_POINTS,
  MAX_QUESTIONS,
  MAX_TIME_LIMIT_SEC,
  MIN_CHOICES,
  MIN_TIME_LIMIT_SEC,
  QUESTION_TEXT_MAX,
  QUIZ_DESCRIPTION_MAX,
  QUIZ_TITLE_MAX,
  STANDARD_TIME_LIMIT_SEC,
} from "../config";

export const TRUE_FALSE_CHOICES = ["True", "False"] as const;

/** Shape check used for every save (drafts may still be incomplete). */
export const questionInputSchema = z.object({
  type: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE"]),
  text: z.string().max(QUESTION_TEXT_MAX, `Question text can be at most ${QUESTION_TEXT_MAX} characters.`),
  choices: z
    .array(z.string().max(CHOICE_TEXT_MAX, `Answer choices can be at most ${CHOICE_TEXT_MAX} characters.`))
    .min(MIN_CHOICES)
    .max(MAX_CHOICES),
  correctIndex: z.int().min(-1).max(MAX_CHOICES - 1),
  imageId: z.string().regex(/^[a-z0-9]{10,40}$/).nullable(),
  timeLimitSec: z.int().min(MIN_TIME_LIMIT_SEC).max(MAX_TIME_LIMIT_SEC),
  points: z.int().min(0).max(MAX_POINTS),
  explanation: z.string().max(EXPLANATION_MAX),
});

export const quizInputSchema = z.object({
  title: z.string().trim().min(1, "Give the quiz a title.").max(QUIZ_TITLE_MAX),
  description: z.string().max(QUIZ_DESCRIPTION_MAX),
  timingMode: z.enum(["STANDARD", "CUSTOM"]),
  scoringMode: z.enum(["SPEED", "ACCURACY"]),
  questions: z.array(questionInputSchema).max(MAX_QUESTIONS, `A quiz can have at most ${MAX_QUESTIONS} questions.`),
});

export type QuestionInput = z.infer<typeof questionInputSchema>;
export type QuizInput = z.infer<typeof quizInputSchema>;

export function blankQuestion(type: QuestionInput["type"] = "MULTIPLE_CHOICE"): QuestionInput {
  return {
    type,
    text: "",
    choices: type === "TRUE_FALSE" ? [...TRUE_FALSE_CHOICES] : ["", "", "", ""],
    correctIndex: -1,
    imageId: null,
    timeLimitSec: STANDARD_TIME_LIMIT_SEC,
    points: DEFAULT_POINTS,
    explanation: "",
  };
}

/** Cleans whitespace and applies mode rules before saving. */
export function normalizeQuiz(input: QuizInput): QuizInput {
  return {
    ...input,
    title: input.title.trim(),
    description: input.description.trim(),
    questions: input.questions.map((q) => ({
      ...q,
      text: q.text.trim(),
      choices: q.type === "TRUE_FALSE" ? [...TRUE_FALSE_CHOICES] : q.choices.map((c) => c.trim()),
      correctIndex: q.type === "TRUE_FALSE" && q.correctIndex > 1 ? -1 : q.correctIndex,
      explanation: q.explanation.trim(),
      // Standard event mode: every question is exactly 60 seconds.
      timeLimitSec: input.timingMode === "STANDARD" ? STANDARD_TIME_LIMIT_SEC : q.timeLimitSec,
    })),
  };
}

export interface QuizIssue {
  /** null for quiz-level issues. */
  questionIndex: number | null;
  field: string;
  message: string;
}

/** Strict checks required before a quiz can be published or played. */
export function validateQuizForPublish(quiz: QuizInput): QuizIssue[] {
  const issues: QuizIssue[] = [];
  if (!quiz.title.trim()) issues.push({ questionIndex: null, field: "title", message: "Give the quiz a title." });
  if (quiz.questions.length === 0) {
    issues.push({ questionIndex: null, field: "questions", message: "Add at least one question." });
  }
  quiz.questions.forEach((q, i) => {
    const push = (field: string, message: string) => issues.push({ questionIndex: i, field, message });
    if (!q.text.trim()) push("text", "Question text is empty.");
    if (q.type === "TRUE_FALSE") {
      if (q.choices.length !== 2 || q.choices[0] !== "True" || q.choices[1] !== "False") {
        push("choices", "True/false questions must have the choices True and False.");
      }
    } else {
      if (q.choices.length < MIN_CHOICES || q.choices.length > MAX_CHOICES) {
        push("choices", `Use between ${MIN_CHOICES} and ${MAX_CHOICES} answer choices.`);
      }
      q.choices.forEach((c, ci) => {
        if (!c.trim()) push(`choices.${ci}`, `Answer ${String.fromCharCode(65 + ci)} is empty.`);
      });
      const seen = new Set<string>();
      q.choices.forEach((c, ci) => {
        const k = c.trim().toLowerCase();
        if (k && seen.has(k)) push(`choices.${ci}`, `Answer ${String.fromCharCode(65 + ci)} duplicates another choice.`);
        seen.add(k);
      });
    }
    if (q.correctIndex < 0 || q.correctIndex >= q.choices.length) push("correctIndex", "Mark the correct answer.");
    if (q.timeLimitSec < MIN_TIME_LIMIT_SEC || q.timeLimitSec > MAX_TIME_LIMIT_SEC) {
      push("timeLimitSec", `Time limit must be between ${MIN_TIME_LIMIT_SEC} and ${MAX_TIME_LIMIT_SEC} seconds.`);
    }
    if (quiz.timingMode === "STANDARD" && q.timeLimitSec !== STANDARD_TIME_LIMIT_SEC) {
      push("timeLimitSec", `Standard event mode requires exactly ${STANDARD_TIME_LIMIT_SEC} seconds.`);
    }
    if (q.points < 0 || q.points > MAX_POINTS) push("points", `Points must be between 0 and ${MAX_POINTS}.`);
  });
  return issues;
}

export const sessionSettingsSchema = z.object({
  capacity: z.int().min(1).max(2000),
  revealSeconds: z.int().min(0).max(30),
  showTeamStanding: z.boolean(),
  showAnswerFeedback: z.boolean(),
  allowLateJoin: z.boolean(),
});

export type SessionSettings = z.infer<typeof sessionSettingsSchema>;
