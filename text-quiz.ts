import { DEFAULT_POINTS, STANDARD_TIME_LIMIT_SEC } from "../config";
import type { QuestionInput } from "../validation/quiz";

export interface ParsedQuiz {
  title: string | null;
  questions: QuestionInput[];
  warnings: string[];
}

const QUESTION_LINE = /^\**\s*(\d{1,3})[.)]\s+(.+?)\s*\**$/;
const OPTION_LINE = /^\**\s*([A-Da-d])[).:]\s*(.+?)\s*\**$/;
const KEY_HEADER = /^\**\s*answer\s*key\s*\**$/i;
const KEY_LINE = /^\**\s*(\d{1,3})[.)]\s*([A-Da-d])\b\**\s*(?:[—–:-]\s*(.*))?$/;

/**
 * Parses plain text in the common printed-quiz format:
 *
 *   1. Question text
 *   A) option   B) option   C) option   D) option
 *   …
 *   ANSWER KEY
 *   1. B — optional explanation
 *
 * Markdown bold markers (**) from Word exports are ignored. Questions with
 * exactly the options True/False become true/false questions.
 */
export function parseTextQuiz(text: string): ParsedQuiz {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean);
  const warnings: string[] = [];
  const questions = new Map<number, { text: string; choices: string[] }>();
  const key = new Map<number, { letter: string; explanation: string }>();
  let title: string | null = null;
  let current: number | null = null;
  let inKey = false;

  for (const line of lines) {
    if (KEY_HEADER.test(line)) {
      inKey = true;
      current = null;
      continue;
    }
    if (inKey) {
      const k = KEY_LINE.exec(line);
      if (k) key.set(Number(k[1]), { letter: k[2].toUpperCase(), explanation: (k[3] ?? "").replace(/\*+/g, "").trim() });
      continue;
    }
    const q = QUESTION_LINE.exec(line);
    if (q) {
      current = Number(q[1]);
      questions.set(current, { text: q[2].replace(/\*+/g, "").trim(), choices: [] });
      continue;
    }
    const o = OPTION_LINE.exec(line);
    if (o && current !== null) {
      const entry = questions.get(current)!;
      const index = o[1].toUpperCase().charCodeAt(0) - 65;
      if (index === entry.choices.length) entry.choices.push(o[2].replace(/\*+/g, "").trim());
      else warnings.push(`Question ${current}: option ${o[1].toUpperCase()} is out of order and was skipped.`);
      continue;
    }
    if (title === null && questions.size === 0) title = line.replace(/\*+/g, "").trim();
  }

  const result: QuestionInput[] = [];
  for (const [n, q] of [...questions.entries()].sort((a, b) => a[0] - b[0])) {
    if (q.choices.length < 2) {
      warnings.push(`Question ${n} has fewer than two options and was skipped.`);
      continue;
    }
    const answer = key.get(n);
    const correctIndex = answer ? answer.letter.charCodeAt(0) - 65 : -1;
    if (!answer) warnings.push(`Question ${n} has no entry in the answer key.`);
    else if (correctIndex >= q.choices.length) warnings.push(`Question ${n}: answer ${answer.letter} is not one of its options.`);
    const isTrueFalse = q.choices.length === 2 && q.choices[0].toLowerCase() === "true" && q.choices[1].toLowerCase() === "false";
    result.push({
      type: isTrueFalse ? "TRUE_FALSE" : "MULTIPLE_CHOICE",
      text: q.text,
      choices: isTrueFalse ? ["True", "False"] : q.choices.slice(0, 4),
      correctIndex: correctIndex < q.choices.length ? correctIndex : -1,
      imageId: null,
      timeLimitSec: STANDARD_TIME_LIMIT_SEC,
      points: DEFAULT_POINTS,
      explanation: answer?.explanation ?? "",
    });
    if (q.choices.length > 4) warnings.push(`Question ${n} had more than four options; only A–D were kept.`);
  }
  return { title, questions: result, warnings };
}
