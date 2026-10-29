import type { NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { handler, json } from "@/lib/http";
import { duplicateQuiz } from "@/lib/quiz-store";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: NextRequest, ctx: { params: Promise<{ quizId: string }> }) => {
  await requireAdminApi(req);
  const { quizId } = await ctx.params;
  const copy = await duplicateQuiz(quizId);
  return json({ ok: true, id: copy.id }, 201);
});
