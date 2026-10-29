"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/fields";
import { TEAM_NAME_MAX } from "@/lib/config";

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok && data.ok === true, data };
}

function formatPinInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits;
}

export function PinForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(initialError ?? "");
  const [busy, setBusy] = useState(false);
  const digits = pin.replace(/\D/g, "");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        if (digits.length !== 8) {
          setError("Game PINs are 8 digits.");
          return;
        }
        setBusy(true);
        setError("");
        const { ok, data } = await postJson("/api/join/lookup", { pin: digits }).catch(() => ({ ok: false, data: { message: "Can't reach the server. Check your connection." } as Record<string, unknown> }));
        if (ok) {
          router.push(`/join/${digits}`);
          return;
        }
        setError(String(data.message ?? "That PIN didn't work. Try again."));
        setBusy(false);
      }}
    >
      <Label htmlFor="pin" className="text-[15px] text-text">
        Game PIN
      </Label>
      <Input
        id="pin"
        name="pin"
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        placeholder="0000 0000"
        value={pin}
        onChange={(e) => setPin(formatPinInput(e.target.value))}
        aria-invalid={!!error}
        aria-describedby={error ? "pin-error" : undefined}
        className="h-16 text-center font-display text-[28px] font-semibold tracking-[0.2em] tabular"
      />
      <div id="pin-error">
        <FieldError>{error}</FieldError>
      </div>
      <Button type="submit" size="xl" disabled={busy || digits.length !== 8}>
        {busy ? <Loader2 className="animate-spin" /> : null}
        Continue
      </Button>
    </form>
  );
}

export function TeamNameForm({ pin }: { pin: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const length = [...name.trim()].length;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        const { ok, data } = await postJson("/api/join", { pin, teamName: name }).catch(() => ({ ok: false, data: { message: "Can't reach the server. Check your connection and try again." } as Record<string, unknown> }));
        if (ok) {
          router.replace(`/play/${String(data.sessionId)}`);
          return;
        }
        setError(String(data.message ?? "Couldn't join. Try again."));
        setBusy(false);
      }}
    >
      <div className="flex items-baseline justify-between">
        <Label htmlFor="team-name" className="text-[15px] text-text">
          Team name
        </Label>
        <span className="text-[12px] text-faint tabular">
          {length}/{TEAM_NAME_MAX}
        </span>
      </div>
      <Input
        id="team-name"
        name="teamName"
        autoComplete="off"
        autoCapitalize="words"
        autoFocus
        maxLength={TEAM_NAME_MAX + 8}
        placeholder="e.g. Quantum Quokkas"
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-invalid={!!error}
        aria-describedby="team-name-help"
        className="h-14 text-[19px] font-semibold"
      />
      <p id="team-name-help" className="text-[13px] text-faint">
        This name appears on the leaderboard. Keep it friendly — the host can remove teams.
      </p>
      <FieldError>{error}</FieldError>
      <Button type="submit" size="xl" disabled={busy || length < 2}>
        {busy ? <Loader2 className="animate-spin" /> : null}
        Join game
      </Button>
    </form>
  );
}
