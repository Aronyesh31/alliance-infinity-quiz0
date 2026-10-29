"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Pencil, Trash2, Upload, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { api } from "@/lib/api-client";

export function QuizRowActions({ id, title, published, gameCount }: { id: string; title: string; published: boolean; gameCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const act = async (fn: () => Promise<{ ok: boolean; data: { message?: string; id?: unknown } }>, after?: (data: { id?: unknown }) => void) => {
    setBusy(true);
    setError("");
    const res = await fn();
    setBusy(false);
    if (!res.ok) {
      setError(res.data.message ?? "That didn't work.");
      return;
    }
    if (after) after(res.data);
    else router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/admin/quizzes/${id}`}>
          <Pencil /> Edit
        </Link>
      </Button>
      <Button variant="ghost" size="sm" disabled={busy} onClick={() => act(() => api(`/api/admin/quizzes/${id}/duplicate`, { method: "POST", body: {} }), (d) => router.push(`/admin/quizzes/${String(d.id)}`))}>
        <Copy /> Duplicate
      </Button>
      <Button variant="ghost" size="sm" disabled={busy} onClick={() => act(() => api(`/api/admin/quizzes/${id}/status`, { body: { publish: !published } }))}>
        {published ? <Undo2 /> : <Upload />} {published ? "Unpublish" : "Publish"}
      </Button>
      <ConfirmDialog
        trigger={
          <Button variant="ghost" size="sm" disabled={busy} aria-label={`Delete ${title}`}>
            <Trash2 />
          </Button>
        }
        title={`Delete "${title}"?`}
        description={
          gameCount > 0
            ? `The quiz is deleted permanently. The ${gameCount} game${gameCount === 1 ? "" : "s"} created from it keep their own copy of the questions and their results.`
            : "The quiz and its questions are deleted permanently."
        }
        confirmLabel="Delete quiz"
        onConfirm={() => act(() => api(`/api/admin/quizzes/${id}`, { method: "DELETE" }))}
      />
      {error ? <p className="w-full text-right text-[13px] text-bad">{error}</p> : null}
    </div>
  );
}
