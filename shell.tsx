"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Gauge, ListChecks, LogOut, Radio, Settings } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";

const nav = [
  { href: "/admin", label: "Overview", icon: Gauge, exact: true },
  { href: "/admin/quizzes", label: "Quizzes", icon: ListChecks },
  { href: "/admin/games", label: "Games", icon: Radio },
  { href: "/admin/results", label: "Results", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({ username, children }: { username: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  const logout = async () => {
    await api("/api/admin/logout", { method: "POST", body: {} });
    window.location.assign("/admin/login");
  };

  return (
    <div className="min-h-dvh bg-ink lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-ink/95 px-4 py-3 backdrop-blur lg:h-dvh lg:flex-col lg:items-stretch lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
        <Link href="/admin" className="shrink-0 lg:px-2" aria-label="Admin overview">
          <Logo size="sm" />
        </Link>
        <nav className="ml-auto flex gap-1 overflow-x-auto lg:ml-0 lg:mt-10 lg:flex-col" aria-label="Admin">
          {nav.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href, exact) ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium text-mute transition-colors hover:bg-white/[0.04] hover:text-text",
                isActive(href, exact) && "bg-raise/70 text-text",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="hidden lg:mt-auto lg:block lg:border-t lg:border-line lg:pt-4">
          <p className="px-3 text-[12px] text-faint">Signed in as</p>
          <p className="truncate px-3 text-[14px] font-medium">{username}</p>
          <button onClick={logout} className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[14px] text-mute hover:bg-white/[0.04] hover:text-text">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
        <button onClick={logout} className="rounded-lg p-2 text-mute hover:text-text lg:hidden" aria-label="Sign out">
          <LogOut className="size-4" />
        </button>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-5 py-6 sm:px-8">
      <div className="min-w-0">
        <h1 className="font-display text-[24px] font-bold leading-tight">{title}</h1>
        {description ? <div className="mt-1 text-[14px] text-mute">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
