import "server-only";
import { prisma, isUniqueViolation } from "./db";
import { ApiError } from "./http";
import { generatePin } from "./game/pin";
import { DEFAULT_CAPACITY, DEFAULT_REVEAL_SECONDS } from "./config";
import { normalizeQuiz, validateQuizForPublish, type QuizInput, type SessionSettings } from "./validation/quiz";

export async function loadQuizInput(quizId: string): Promise<(QuizInput & { id: string; status: "DRAFT" | "PUBLISHED" }) | null> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { position: "asc" } } },
  });
  if (!quiz) return null;
  return {
    id: quiz.id,
    status: quiz.status,
    title: quiz.title,
    description: quiz.description,
    timingMode: quiz.timingMode,
    scoringMode: quiz.scoringMode,
    questions: quiz.questions.map((q) => ({
      type: q.type,
      text: q.text,
      choices: q.choices,
      correctIndex: q.correctIndex,
      imageId: q.imageId,
      timeLimitSec: q.timeLimitSec,
      points: q.points,
      explanation: q.explanation,
    })),
  };
}

async function assertImagesExist(input: QuizInput) {
  const ids = [...new Set(input.questions.map((q) => q.imageId).filter((x): x is string => !!x))];
  if (ids.length === 0) return;
  const found = await prisma.image.count({ where: { id: { in: ids } } });
  if (found !== ids.length) throw new ApiError(400, "missing_image", "One of the question images no longer exists. Upload it again.");
}

/**
 * Saves the whole quiz (questions are replaced in one transaction so the order
 * is always consistent). `publish` true validates strictly and publishes;
 * false keeps it a draft. Saving an already-published quiz re-validates it.
 */
export async function saveQuiz(quizId: string | null, raw: QuizInput, publish: boolean | "keep") {
  const input = normalizeQuiz(raw);
  await assertImagesExist(input);

  let targetStatus: "DRAFT" | "PUBLISHED" = "DRAFT";
  if (publish === "keep" && quizId) {
    const current = await prisma.quiz.findUnique({ where: { id: quizId }, select: { status: true } });
    if (!current) throw new ApiError(404, "not_found", "Quiz not found.");
    targetStatus = current.status;
  } else if (publish === true) {
    targetStatus = "PUBLISHED";
  }

  if (targetStatus === "PUBLISHED") {
    const issues = validateQuizForPublish(input);
    if (issues.length > 0) {
      throw Object.assign(new ApiError(422, "incomplete", "Fix the highlighted problems before publishing."), { issues });
    }
  }

  const questionRows = input.questions.map((q, position) => ({ ...q, position }));
  return prisma.$transaction(async (tx) => {
    const data = {
      title: input.title,
      description: input.description,
      timingMode: input.timingMode,
      scoringMode: input.scoringMode,
      status: targetStatus,
      publishedAt: targetStatus === "PUBLISHED" ? new Date() : null,
    };
    const quiz = quizId
      ? await tx.quiz.update({ where: { id: quizId }, data })
      : await tx.quiz.create({ data });
    await tx.question.deleteMany({ where: { quizId: quiz.id } });
    if (questionRows.length > 0) {
      await tx.question.createMany({ data: questionRows.map((q) => ({ ...q, quizId: quiz.id })) });
    }
    return quiz;
  });
}

export async function duplicateQuiz(quizId: string) {
  const source = await loadQuizInput(quizId);
  if (!source) throw new ApiError(404, "not_found", "Quiz not found.");
  const { id: _id, status: _status, ...input } = source;
  return saveQuiz(null, { ...input, title: `${input.title} (copy)`.slice(0, 120) }, false);
}

export const defaultSessionSettings: SessionSettings = {
  capacity: DEFAULT_CAPACITY,
  revealSeconds: DEFAULT_REVEAL_SECONDS,
  showTeamStanding: true,
  showAnswerFeedback: true,
  allowLateJoin: false,
};

/** Creates a game from a published quiz, freezing a copy of its questions. */
export async function createSession(quizId: string, settings: SessionSettings) {
  const quiz = await loadQuizInput(quizId);
  if (!quiz) throw new ApiError(404, "not_found", "Quiz not found.");
  if (quiz.status !== "PUBLISHED") throw new ApiError(409, "not_published", "Publish the quiz before creating a game from it.");
  const issues = validateQuizForPublish(quiz);
  if (issues.length > 0) throw new ApiError(422, "incomplete", "This quiz has incomplete questions. Open it in the editor and fix them.");

  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const session = await tx.gameSession.create({
          data: {
            pin: generatePin(),
            quizId: quiz.id,
            title: quiz.title,
            scoringMode: quiz.scoringMode,
            questionCount: quiz.questions.length,
            registrationOpen: true,
            ...settings,
          },
        });
        await tx.sessionQuestion.createMany({
          data: quiz.questions.map((q, position) => ({
            sessionId: session.id,
            position,
            type: q.type,
            text: q.text,
            choices: q.choices,
            correctIndex: q.correctIndex,
            imageId: q.imageId,
            timeLimitSec: q.timeLimitSec,
            points: q.points,
            explanation: q.explanation,
          })),
        });
        await tx.gameEvent.create({ data: { sessionId: session.id, message: `Game created from "${quiz.title}" with ${quiz.questions.length} questions.` } });
        return session;
      });
    } catch (error) {
      if (isUniqueViolation(error)) continue; // PIN collision — try another
      throw error;
    }
  }
  throw new ApiError(503, "pin_exhausted", "Could not generate a unique game PIN. Try again.");
}
