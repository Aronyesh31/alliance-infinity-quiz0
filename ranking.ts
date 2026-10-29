export interface RankableTeam {
  id: string;
  name: string;
  score: number;
  correctCount: number;
  /** Sum of response times of correct answers, in ms. Lower is better. */
  correctTimeMs: number;
  joinedAt: number;
}

export type RankedTeam<T extends RankableTeam> = T & { rank: number };

/**
 * Ordering: score (high first), then correct answers (high first), then total
 * time spent on correct answers (low first). Teams equal on all three share a
 * rank (standard competition ranking: 1, 2, 2, 4). Join time only stabilises
 * display order and never separates a tie.
 */
export function rankTeams<T extends RankableTeam>(teams: readonly T[]): RankedTeam<T>[] {
  const sorted = [...teams].sort(compareTeams);
  const ranked: RankedTeam<T>[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const team = sorted[i];
    const prev = ranked[i - 1];
    const tied =
      prev !== undefined &&
      prev.score === team.score &&
      prev.correctCount === team.correctCount &&
      prev.correctTimeMs === team.correctTimeMs;
    ranked.push({ ...team, rank: tied ? prev.rank : i + 1 });
  }
  return ranked;
}

export function compareTeams(a: RankableTeam, b: RankableTeam): number {
  if (b.score !== a.score) return b.score - a.score;
  if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
  if (a.correctTimeMs !== b.correctTimeMs) return a.correctTimeMs - b.correctTimeMs;
  if (a.joinedAt !== b.joinedAt) return a.joinedAt - b.joinedAt;
  return a.name.localeCompare(b.name);
}
