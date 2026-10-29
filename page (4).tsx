import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth/admin";
import { QuizEditor } from "@/components/admin/quiz-editor";
import { blankQuestion } from "@/lib/validation/quiz";

export const metadata: Metadata = { title: "New quiz" };
export const dynamic = "force-dynamic";

export default async function NewQuizPage() {
  await requireAdminPage();
  return (
    <QuizEditor
      quizId={null}
      initialStatus="DRAFT"
      initial={{ title: "", description: "", timingMode: "STANDARD", scoringMode: "SPEED", questions: [blankQuestion()] }}
    />
  );
}
