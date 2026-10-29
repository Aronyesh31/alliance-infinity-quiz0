"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/fields";
import { api } from "@/lib/api-client";
import { MIN_ADMIN_PASSWORD } from "@/lib/config";

export function PasswordForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  return (
    <form
      className="grid gap-4 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        const next = String(data.get("newPassword") ?? "");
        if (next !== String(data.get("confirm") ?? "")) {
          setError("The new passwords don't match.");
          return;
        }
        setBusy(true);
        setError("");
        setDone("");
        const res = await api<{ signedOutSessions: number }>("/api/admin/password", {
          body: { currentPassword: String(data.get("currentPassword") ?? ""), newPassword: next },
        });
        setBusy(false);
        if (res.ok) {
          form.reset();
          setDone(res.data.signedOutSessions ? `Password changed. ${res.data.signedOutSessions} other session(s) signed out.` : "Password changed.");
        } else {
          setError(res.data.message ?? "Couldn't change the password.");
        }
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="newPassword">New password</Label>
          <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={MIN_ADMIN_PASSWORD} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm">Repeat new password</Label>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={MIN_ADMIN_PASSWORD} required />
        </div>
      </div>
      <p className="text-[13px] text-faint">At least {MIN_ADMIN_PASSWORD} characters. A long passphrase is best.</p>
      <FieldError>{error}</FieldError>
      {done ? <p className="text-[14px] text-good">{done}</p> : null}
      <Button type="submit" variant="secondary" disabled={busy} className="justify-self-start">
        {busy ? <Loader2 className="animate-spin" /> : null} Change password
      </Button>
    </form>
  );
}
