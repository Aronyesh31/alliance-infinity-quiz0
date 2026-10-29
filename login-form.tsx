"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/fields";
import { api } from "@/lib/api-client";

export function AdminLoginForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const form = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        const res = await api("/api/admin/login", {
          body: { username: String(form.get("username") ?? ""), password: String(form.get("password") ?? "") },
        });
        if (res.ok) {
          window.location.assign("/admin");
          return;
        }
        setError(res.data.message ?? "Sign in failed.");
        setBusy(false);
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <FieldError>{error}</FieldError>
      <Button type="submit" size="lg" disabled={busy} className="mt-2">
        {busy ? <Loader2 className="animate-spin" /> : null}
        Sign in
      </Button>
    </form>
  );
}
