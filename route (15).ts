import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth/admin";
import { ApiError, handler, json, readJson } from "@/lib/http";
import { quizInputSchema } from "@/lib/validation/quiz";
import { saveQuiz } from "@/lib/quiz-store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ quizId: string }> };
const schema = z.object({ quiz: quizInputSchema, mode: z.enum(["draft", "publish"]) });

export const PUT = handler(async (req: NextRequest, ctx: Ctx) => {
  await requireAdminApi(req);
  const { quizId } = await ctx.params;
  const { quiz, mode } = await readJson(req, schema);
  const exists = await prisma.quiz.findUnique({ where: { id: quizId }, select: { id: true } });
  if (!exists) throw new ApiError(404, "not_found", "Quiz not found.");
  const saved = await saveQuiz(quizId, quiz, mode === "publish");
  return json({ ok: true, id: saved.id, status: saved.status });
});

export const DELETE = handler(async (req: NextRequest, ctx: Ctx) => {
  await requireAdminApi(req);
  const { quizId } = await ctx.params;
  // Games created from this quiz keep their own frozen copy of the questions.
  const deleted = await prisma.quiz.deleteMany({ where: { id: quizId } });
  if (deleted.count === 0) throw new ApiError(404, "not_found", "Quiz not found.");
  return json({ ok: true });
});
