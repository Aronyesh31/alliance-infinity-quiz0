import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="field flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo size="md" />
      <h1 className="font-display text-[26px] font-bold">This page doesn’t exist</h1>
      <p className="max-w-sm text-[15px] text-mute">Check the link, or start again from the home page.</p>
      <Button asChild size="lg">
        <Link href="/">Go to the home page</Link>
      </Button>
    </main>
  );
}
