import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin";
import { ApiError, handler, json, readJson } from "@/lib/http";
import { loadQuizInput, saveQuiz } from "@/lib/quiz-store";

export const dynamic = "force-dynamic";

const schema = z.object({ publish: z.boolean() });

/** Publishes (after strict validation) or returns a quiz to draft. */
export const POST = handler(async (req: NextRequest, ctx: { params: Promise<{ quizId: string }> }) => {
  await requireAdminApi(req);
  const { quizId } = await ctx.params;
  const { publish } = await readJson(req, schema, 256);
  const quiz = await loadQuizInput(quizId);
  if (!quiz) throw new ApiError(404, "not_found", "Quiz not found.");
  const { id: _id, status: _status, ...input } = quiz;
  const saved = await saveQuiz(quizId, input, publish);
  return json({ ok: true, status: saved.status });
});
