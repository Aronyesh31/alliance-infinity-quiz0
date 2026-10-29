import type { Metadata } from "next";
import { JoinShell } from "@/components/game/join-shell";
import { PinForm } from "@/components/game/join-forms";

export const metadata: Metadata = { title: "Join" };

export default function JoinPage() {
  return (
    <JoinShell step="Step 1 of 2">
      <h1 className="font-display text-[28px] font-bold leading-tight">Join the quiz</h1>
      <p className="mb-7 mt-2 text-[15px] text-mute">Type the PIN shown on the presentation screen.</p>
      <PinForm />
    </JoinShell>
  );
}
