import * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "border-line-strong text-mute",
  ion: "border-ion/40 bg-ion/10 text-ion-soft",
  flux: "border-flux/40 bg-flux/10 text-flux",
  good: "border-good/40 bg-good/10 text-good",
  warn: "border-warn/40 bg-warn/10 text-warn",
  bad: "border-bad/40 bg-bad/10 text-bad",
} as const;

export function Badge({ tone = "neutral", className, children }: { tone?: keyof typeof tones; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

export function StatusDot({ tone }: { tone: "good" | "warn" | "bad" | "idle" }) {
  const color = { good: "bg-good", warn: "bg-warn", bad: "bg-bad", idle: "bg-faint" }[tone];
  return (
    <span className="relative inline-flex size-2.5" aria-hidden>
      {tone === "good" ? <span className={cn("absolute inset-0 rounded-full opacity-60 animate-ping", color)} /> : null}
      <span className={cn("relative inline-flex size-2.5 rounded-full", color)} />
    </span>
  );
}

export function Panel({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section className={cn("rounded-2xl border border-line bg-night/70", className)} {...props}>
      {children}
    </section>
  );
}

export function PanelHeader({ title, description, action }: { title: string; description?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {description ? <p className="mt-0.5 text-[13px] text-mute">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <p className="font-display text-[16px] font-semibold">{title}</p>
      {children ? <div className="max-w-md text-[14px] text-mute">{children}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
