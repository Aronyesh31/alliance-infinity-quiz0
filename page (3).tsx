import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/admin";
import { loadQuizInput } from "@/lib/quiz-store";
import { QuizEditor } from "@/components/admin/quiz-editor";

export const metadata: Metadata = { title: "Edit quiz" };
export const dynamic = "force-dynamic";

export default async function EditQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  await requireAdminPage();
  const { quizId } = await params;
  const quiz = await loadQuizInput(quizId);
  if (!quiz) notFound();
  const { id, status, ...input } = quiz;
  return <QuizEditor quizId={id} initialStatus={status} initial={input} />;
}
