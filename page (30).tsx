import Link from "next/link";
import { AllianceCrest, Logo } from "@/components/brand/logo";
import { InfinityBackdrop } from "@/components/brand/infinity-backdrop";
import { Button } from "@/components/ui/button";

const steps = [
  { title: "Enter the game PIN", body: "The 8-digit PIN is on the big screen. You can also scan the QR code." },
  { title: "Name your team", body: "One device per team. Pick a name nobody else has taken." },
  { title: "Wait in the lobby", body: "Your screen switches to the first question the moment the host starts." },
];

const rules = [
  "Every question is open for 60 seconds, then the next one starts on its own.",
  "Your team gets one answer per question. It locks the moment you tap.",
  "Correct answers score up to 1,000 points — faster answers score more.",
];

export default function LandingPage() {
  return (
    <main className="field relative min-h-dvh overflow-hidden">
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo size="md" />
        <Link href="/admin/login" className="rounded-lg px-3 py-2 text-[14px] text-mute transition-colors hover:text-text">
          Admin login
        </Link>
      </header>

      <section className="relative mx-auto grid max-w-6xl gap-6 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.45fr_1fr] lg:items-center lg:gap-10 lg:pt-20">
        <div className="relative z-10 animate-rise">
          <h1 className="font-display text-[clamp(2.6rem,7.4vw,5.4rem)] font-bold leading-[0.98] tracking-[-0.02em] glow-text">
            <span className="block whitespace-nowrap">Think Fast.</span>
            <span className="block whitespace-nowrap">Play Smart.</span>
          </h1>
          <p className="mt-6 max-w-md text-[clamp(1.05rem,2.2vw,1.3rem)] leading-snug text-mute">
            One challenge. 400 teams. Every second counts.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="xl" className="sm:min-w-56">
              <Link href="/join">Join the Quiz</Link>
            </Button>
            <Button asChild size="xl" variant="secondary">
              <Link href="/admin/login">Admin Login</Link>
            </Button>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden>
          <InfinityBackdrop className="w-full" />
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.title} className="bg-night/95 p-6">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-[22px] font-semibold text-flux tabular">{i + 1}</span>
                <h2 className="text-[17px] font-semibold">{step.title}</h2>
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-mute">{step.body}</p>
            </div>
          ))}
        </div>
        <ul className="mt-8 grid gap-3 text-[15px] text-mute md:grid-cols-3">
          {rules.map((rule) => (
            <li key={rule} className="flex gap-3">
              <span className="mt-2 h-px w-4 shrink-0 bg-ion-soft/60" aria-hidden />
              <span className="leading-relaxed">{rule}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="relative z-10 border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-5 py-6 text-[13px] text-faint sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-3">
            <AllianceCrest className="size-9" />
            <span>Hosted at Alliance University by the Infinity Club</span>
          </div>
          <span>Need help? Ask a volunteer at the front desk.</span>
        </div>
      </footer>
    </main>
  );
}
