import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/** Narrow, centred frame for the join steps (phone-first). */
export function JoinShell({ children, step }: { children: React.ReactNode; step?: string }) {
  return (
    <main className="field flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-5 py-5">
        <Link href="/" aria-label="Home">
          <Logo size="sm" />
        </Link>
        {step ? <span className="text-[13px] text-faint">{step}</span> : null}
      </header>
      <div className="flex flex-1 items-start justify-center px-5 pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm animate-rise">{children}</div>
      </div>
    </main>
  );
}
