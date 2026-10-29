import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth/admin";
import { adminExists, setupCodeConfigured } from "@/lib/auth/setup";
import { Logo } from "@/components/brand/logo";
import { AdminLoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Admin sign in" };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect("/admin");
  // First run: no admin yet and web setup enabled → create the account instead.
  if (setupCodeConfigured() && !(await adminExists())) redirect("/admin/setup");
  return (
    <main className="field flex min-h-dvh flex-col">
      <header className="px-6 py-5">
        <Link href="/" aria-label="Home">
          <Logo size="sm" />
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-5 pb-20">
        <div className="w-full max-w-sm animate-rise">
          <h1 className="font-display text-[26px] font-bold">Admin sign in</h1>
          <p className="mb-7 mt-2 text-[15px] text-mute">For the event administrator only.</p>
          <AdminLoginForm />
        </div>
      </div>
    </main>
  );
}
