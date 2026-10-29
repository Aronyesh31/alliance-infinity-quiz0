import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin";
import { handler, json, readJson } from "@/lib/http";
import { sessionSettingsSchema } from "@/lib/validation/quiz";
import { createSession } from "@/lib/quiz-store";

export const dynamic = "force-dynamic";

const schema = z.object({ quizId: z.string().min(1).max(40), settings: sessionSettingsSchema });

export const POST = handler(async (req: NextRequest) => {
  await requireAdminApi(req);
  const { quizId, settings } = await readJson(req, schema, 4096);
  const session = await createSession(quizId, settings);
  return json({ ok: true, id: session.id, pin: session.pin }, 201);
});
