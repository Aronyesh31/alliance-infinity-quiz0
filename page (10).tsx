import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { adminExists, setupCodeConfigured } from "@/lib/auth/setup";
import { Logo } from "@/components/brand/logo";
import { AdminSetupForm } from "@/components/admin/setup-form";

export const metadata: Metadata = { title: "Set up admin" };
export const dynamic = "force-dynamic";

export default async function AdminSetupPage() {
  if (await adminExists()) redirect("/admin/login");
  const enabled = setupCodeConfigured();
  return (
    <main className="field flex min-h-dvh flex-col">
      <header className="px-6 py-5">
        <Link href="/" aria-label="Home">
          <Logo size="sm" />
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-5 pb-20">
        <div className="w-full max-w-sm animate-rise">
          <h1 className="font-display text-[26px] font-bold">Create the admin account</h1>
          {enabled ? (
            <>
              <p className="mb-7 mt-2 text-[15px] text-mute">
                This works once. Enter the setup code you were given, then choose your own username and password.
              </p>
              <AdminSetupForm />
            </>
          ) : (
            <p className="mt-3 text-[15px] text-mute">
              Web setup is turned off on this server. Run <code className="text-text">npm run admin:setup</code>, or set ADMIN_SETUP_CODE and redeploy.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
