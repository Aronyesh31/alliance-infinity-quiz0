export type ScoringMode = "SPEED" | "ACCURACY";

export interface ScoreInput {
  isCorrect: boolean;
  maxPoints: number;
  /** Milliseconds between the question opening and the server receiving the answer. */
  responseMs: number;
  timeLimitMs: number;
  mode: ScoringMode;
}

/**
 * Points for one answer. Never negative.
 *
 * SPEED: a correct answer earns between 50% (answered at the buzzer) and 100%
 * (answered instantly) of the question's points.
 * ACCURACY: a correct answer earns full points regardless of speed.
 * Incorrect and missing answers always earn zero.
 */
export function computePoints({ isCorrect, maxPoints, responseMs, timeLimitMs, mode }: ScoreInput): number {
  if (!isCorrect || maxPoints <= 0) return 0;
  if (mode === "ACCURACY") return Math.round(maxPoints);
  const limit = timeLimitMs > 0 ? timeLimitMs : 1;
  const ratio = Math.min(1, Math.max(0, responseMs / limit));
  return Math.max(0, Math.round(maxPoints * (1 - ratio / 2)));
}
