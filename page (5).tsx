import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2, Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/admin";
import { PageHeader } from "@/components/admin/shell";
import { QuizRowActions } from "@/components/admin/quiz-row-actions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/fields";
import { Badge, EmptyState, Panel } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Quizzes" };
export const dynamic = "force-dynamic";

export default async function QuizzesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireAdminPage();
  const { q = "", status = "all" } = await searchParams;
  const term = q.trim().slice(0, 100);
  const statusFilter = status === "draft" ? "DRAFT" : status === "published" ? "PUBLISHED" : undefined;

  const quizzes = await prisma.quiz.findMany({
    where: {
      ...(term ? { OR: [{ title: { contains: term, mode: "insensitive" } }, { description: { contains: term, mode: "insensitive" } }] } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, status: true, timingMode: true, scoringMode: true, updatedAt: true, _count: { select: { questions: true, sessions: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Quizzes"
        description="Write questions, then publish a quiz to run it as a game."
        actions={
          <Button asChild>
            <Link href="/admin/quizzes/new">
              <FilePlus2 /> New quiz
            </Link>
          </Button>
        }
      />
      <div className="px-5 py-6 sm:px-8">
        <form className="mb-5 flex flex-wrap gap-3" role="search">
          <div className="relative min-w-60 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <Input name="q" defaultValue={term} placeholder="Search quizzes" className="pl-10" aria-label="Search quizzes" />
          </div>
          <Select name="status" defaultValue={status} className="w-44" aria-label="Filter by status">
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </Select>
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        </form>

        <Panel>
          {quizzes.length === 0 ? (
            <EmptyState
              title={term || statusFilter ? "No quizzes match" : "No quizzes yet"}
              action={
                <Button asChild>
                  <Link href="/admin/quizzes/new">Create a quiz</Link>
                </Button>
              }
            >
              {term || statusFilter ? "Try a different search or filter." : "Start with a blank quiz or paste questions from a document."}
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {quizzes.map((quiz) => (
                <li key={quiz.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/quizzes/${quiz.id}`} className="block truncate text-[15px] font-semibold hover:text-flux">
                      {quiz.title}
                    </Link>
                    <p className="mt-0.5 text-[13px] text-mute">
                      {quiz._count.questions} questions, {quiz.timingMode === "STANDARD" ? "60 s each" : "custom timing"},{" "}
                      {quiz.scoringMode === "SPEED" ? "speed scoring" : "accuracy scoring"}. Edited {formatDateTime(quiz.updatedAt)}
                    </p>
                  </div>
                  <Badge tone={quiz.status === "PUBLISHED" ? "good" : "neutral"}>{quiz.status === "PUBLISHED" ? "Published" : "Draft"}</Badge>
                  <QuizRowActions id={quiz.id} title={quiz.title} published={quiz.status === "PUBLISHED"} gameCount={quiz._count.sessions} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
