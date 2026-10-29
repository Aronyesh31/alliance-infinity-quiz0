import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin";
import { handler, json, readJson } from "@/lib/http";
import { quizInputSchema } from "@/lib/validation/quiz";
import { saveQuiz } from "@/lib/quiz-store";

export const dynamic = "force-dynamic";

const schema = z.object({ quiz: quizInputSchema, mode: z.enum(["draft", "publish"]) });

export const POST = handler(async (req: NextRequest) => {
  await requireAdminApi(req);
  const { quiz, mode } = await readJson(req, schema);
  const saved = await saveQuiz(null, quiz, mode === "publish");
  return json({ ok: true, id: saved.id, status: saved.status }, 201);
});
