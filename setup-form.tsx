"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/fields";
import { api } from "@/lib/api-client";
import { MIN_ADMIN_PASSWORD } from "@/lib/config";

export function AdminSetupForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const form = new FormData(e.currentTarget);
        const password = String(form.get("password") ?? "");
        if (password !== String(form.get("confirm") ?? "")) {
          setError("The passwords don't match.");
          return;
        }
        setBusy(true);
        setError("");
        const res = await api("/api/admin/setup", {
          body: { setupCode: String(form.get("setupCode") ?? ""), username: String(form.get("username") ?? ""), password },
        });
        if (res.ok) {
          window.location.assign("/admin");
          return;
        }
        if (res.data.code === "done") {
          window.location.assign("/admin/login");
          return;
        }
        setError(res.data.message ?? "Setup failed.");
        setBusy(false);
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="setupCode">Setup code</Label>
        <Input id="setupCode" name="setupCode" autoComplete="off" autoCapitalize="none" spellCheck={false} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="e.g. host" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={MIN_ADMIN_PASSWORD} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm">Repeat password</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={MIN_ADMIN_PASSWORD} required />
      </div>
      <p className="text-[13px] text-faint">At least {MIN_ADMIN_PASSWORD} characters. A short phrase works well.</p>
      <FieldError>{error}</FieldError>
      <Button type="submit" size="lg" disabled={busy} className="mt-2">
        {busy ? <Loader2 className="animate-spin" /> : null}
        Create admin account
      </Button>
    </form>
  );
}
