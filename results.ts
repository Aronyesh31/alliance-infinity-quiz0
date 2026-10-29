import "server-only";
import { prisma } from "./db";
import { rankTeams } from "./game/ranking";

/** Everything the admin results page and CSV exports need for one game. */
export async function loadResults(sessionId: string) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { questions: { orderBy: { position: "asc" } } },
  });
  if (!session) return null;

  const [teams, answers] = await Promise.all([
    prisma.team.findMany({ where: { sessionId }, orderBy: { joinedAt: "asc" } }),
    prisma.answer.findMany({
      where: { sessionId },
      orderBy: [{ questionIndex: "asc" }, { receivedAt: "asc" }],
      select: { teamId: true, questionIndex: true, choiceIndex: true, isCorrect: true, points: true, responseMs: true, receivedAt: true },
    }),
  ]);

  const responseTotals = new Map<string, { sum: number; n: number }>();
  for (const a of answers) {
    const t = responseTotals.get(a.teamId) ?? { sum: 0, n: 0 };
    t.sum += a.responseMs;
    t.n += 1;
    responseTotals.set(a.teamId, t);
  }

  const shaped = teams.map((t) => {
    const r = responseTotals.get(t.id);
    return {
      id: t.id,
      name: t.name,
      score: t.score,
      correctCount: t.correctCount,
      answeredCount: t.answeredCount,
      correctTimeMs: t.correctTimeMs,
      joinedAt: t.joinedAt.getTime(),
      removed: t.removedAt !== null,
      avgResponseMs: r && r.n > 0 ? r.sum / r.n : null,
    };
  });

  const ranked = rankTeams(shaped.filter((t) => !t.removed)).map((t) => ({ ...t, joinedAt: new Date(t.joinedAt) }));
  const removed = shaped.filter((t) => t.removed).map((t) => ({ ...t, joinedAt: new Date(t.joinedAt) }));

  const questionStats = session.questions.map((q) => {
    const forQ = answers.filter((a) => a.questionIndex === q.position);
    const distribution = q.choices.map((_, i) => forQ.filter((a) => a.choiceIndex === i).length);
    const correct = forQ.filter((a) => a.isCorrect).length;
    return {
      index: q.position,
      text: q.text,
      choices: q.choices,
      correctIndex: q.correctIndex,
      answered: forQ.length,
      correct,
      distribution,
      avgResponseMs: forQ.length ? forQ.reduce((s, a) => s + a.responseMs, 0) / forQ.length : null,
    };
  });

  return { session, ranked, removed, questions: session.questions, answers, questionStats };
}
