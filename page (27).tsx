import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatPin, normalizePin } from "@/lib/game/pin";
import { joinAvailability } from "@/lib/join";
import { getTeamFromCookie } from "@/lib/auth/team";
import { JoinShell } from "@/components/game/join-shell";
import { PinForm, TeamNameForm } from "@/components/game/join-forms";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Join" };
export const dynamic = "force-dynamic";

export default async function JoinWithPinPage({ params }: { params: Promise<{ pin: string }> }) {
  const { pin: raw } = await params;
  const pin = normalizePin(raw);
  const session = pin
    ? await prisma.gameSession.findUnique({
        where: { pin },
        select: { id: true, title: true, state: true, registrationOpen: true, allowLateJoin: true, teamCount: true, capacity: true },
      })
    : null;

  if (!session) {
    return (
      <JoinShell step="Step 1 of 2">
        <h1 className="font-display text-[28px] font-bold leading-tight">Join the quiz</h1>
        <p className="mb-7 mt-2 text-[15px] text-mute">Type the PIN shown on the presentation screen.</p>
        <PinForm initialError="No game uses that PIN. Check the number on the screen." />
      </JoinShell>
    );
  }

  const existing = await getTeamFromCookie();
  if (existing && existing.sessionId === session.id) {
    return (
      <JoinShell>
        <p className="text-[14px] text-mute">{session.title}</p>
        <h1 className="mt-1 font-display text-[26px] font-bold leading-tight">You’re already in as {existing.name}</h1>
        <p className="mb-7 mt-3 text-[15px] text-mute">This device is registered to your team. Pick up where you left off.</p>
        <Button asChild size="xl" className="w-full">
          <Link href={`/play/${session.id}`}>Continue to the game</Link>
        </Button>
      </JoinShell>
    );
  }

  const availability = joinAvailability(session);
  return (
    <JoinShell step="Step 2 of 2">
      <p className="text-[14px] text-mute">
        Game <span className="font-display tabular text-text">{formatPin(pin!)}</span>
      </p>
      <h1 className="mt-1 font-display text-[26px] font-bold leading-tight">{session.title}</h1>
      {availability.ok ? (
        <div className="mt-7">
          <TeamNameForm pin={pin!} />
        </div>
      ) : (
        <div className="mt-7 rounded-2xl border border-line bg-night/80 p-5">
          <p className="text-[16px] font-semibold">{availability.message}</p>
          <Button asChild variant="secondary" size="lg" className="mt-5 w-full">
            <Link href="/join">Enter a different PIN</Link>
          </Button>
        </div>
      )}
    </JoinShell>
  );
}
