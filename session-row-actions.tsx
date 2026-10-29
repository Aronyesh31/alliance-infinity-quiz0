"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { api } from "@/lib/api-client";

export function SessionRowActions({ id, title, state }: { id: string; title: string; state: string }) {
  const router = useRouter();
  const deletable = state === "LOBBY" || state === "FINISHED";
  return (
    <div className="flex items-center justify-end gap-1">
      <Button asChild variant="ghost" size="sm">
        <Link href={state === "FINISHED" ? `/admin/results/${id}` : `/admin/games/${id}`}>{state === "FINISHED" ? "Results" : "Control"}</Link>
      </Button>
      {deletable ? (
        <ConfirmDialog
          trigger={
            <button className="rounded-md p-1.5 text-faint hover:bg-bad/10 hover:text-bad" aria-label={`Delete ${title}`}>
              <Trash2 className="size-4" />
            </button>
          }
          title="Delete this game?"
          description={state === "FINISHED" ? "Its teams, answers and results are deleted permanently. Export the CSV first if you need it." : "Teams that already joined will be disconnected."}
          confirmLabel="Delete game"
          onConfirm={async () => {
            const res = await api(`/api/admin/sessions/${id}`, { method: "DELETE" });
            if (res.ok) router.refresh();
            else alert(res.data.message ?? "Couldn't delete the game.");
          }}
        />
      ) : null}
    </div>
  );
}
