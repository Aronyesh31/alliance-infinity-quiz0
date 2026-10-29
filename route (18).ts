import type { NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { ApiError, handler } from "@/lib/http";
import { toCsv } from "@/lib/csv";
import { loadResults } from "@/lib/results";

export const dynamic = "force-dynamic";

function fileSafe(text: string) {
  return text.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60) || "game";
}

/** CSV exports for the admin: final rankings, or every individual answer. */
export const GET = handler(async (req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) => {
  await requireAdminApi(req);
  const { sessionId } = await ctx.params;
  const kind = req.nextUrl.searchParams.get("kind") === "answers" ? "answers" : "rankings";
  const results = await loadResults(sessionId);
  if (!results) throw new ApiError(404, "not_found", "Game not found.");
  const { session, ranked, removed, questions, answers } = results;

  let csv: string;
  if (kind === "rankings") {
    csv = toCsv([
      ["Rank", "Team", "Score", "Correct answers", "Questions answered", "Total questions", "Accuracy %", "Average response (s)", "Joined at", "Status"],
      ...ranked.map((t) => [
        t.rank,
        t.name,
        t.score,
        t.correctCount,
        t.answeredCount,
        session.questionCount,
        session.questionCount ? Math.round((t.correctCount / session.questionCount) * 1000) / 10 : 0,
        t.avgResponseMs === null ? null : Math.round(t.avgResponseMs / 100) / 10,
        t.joinedAt,
        "Active",
      ]),
      ...removed.map((t) => [null, t.name, t.score, t.correctCount, t.answeredCount, session.questionCount, null, null, t.joinedAt, "Removed"]),
    ]);
  } else {
    const teamName = new Map([...ranked, ...removed].map((t) => [t.id, t.name]));
    csv = toCsv([
      ["Team", "Question #", "Question", "Answer", "Answer text", "Correct", "Points", "Response (s)", "Received at"],
      ...answers.map((a) => {
        const q = questions[a.questionIndex];
        return [
          teamName.get(a.teamId) ?? a.teamId,
          a.questionIndex + 1,
          q?.text ?? "",
          String.fromCharCode(65 + a.choiceIndex),
          q?.choices[a.choiceIndex] ?? "",
          a.isCorrect,
          a.points,
          Math.round(a.responseMs / 100) / 10,
          a.receivedAt,
        ];
      }),
    ]);
  }

  const name = `${fileSafe(session.title)}-${session.pin}-${kind}.csv`;
  // UTF-8 BOM so Excel shows non-English team names correctly.
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
});
