"use client";

import * as React from "react";
import { AlertDialog as AlertPrimitive, Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

const overlay = "fixed inset-0 z-50 bg-ink/75 backdrop-blur-sm data-[state=open]:animate-[rise_200ms_ease-out]";
const panel =
  "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line-strong bg-deep p-6 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)] focus:outline-none";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ className, children, title, description, ...props }: React.ComponentProps<typeof DialogPrimitive.Content> & { title: string; description?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlay} />
      <DialogPrimitive.Content className={cn(panel, className)} {...props}>
        <DialogPrimitive.Title className="font-display text-[18px] font-semibold">{title}</DialogPrimitive.Title>
        {description ? <DialogPrimitive.Description className="mt-1.5 text-[14px] text-mute">{description}</DialogPrimitive.Description> : <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>}
        <div className="mt-5">{children}</div>
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1 text-mute hover:text-text" aria-label="Close">
          <X className="size-5" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Confirmation for destructive or irreversible actions. */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  tone = "danger",
  onConfirm,
  disabled,
}: {
  trigger: React.ReactNode;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const [busy, setBusy] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  return (
    <AlertPrimitive.Root open={open} onOpenChange={setOpen}>
      <AlertPrimitive.Trigger asChild disabled={disabled}>
        {trigger}
      </AlertPrimitive.Trigger>
      <AlertPrimitive.Portal>
        <AlertPrimitive.Overlay className={overlay} />
        <AlertPrimitive.Content className={panel}>
          <AlertPrimitive.Title className="font-display text-[18px] font-semibold">{title}</AlertPrimitive.Title>
          <AlertPrimitive.Description asChild>
            <div className="mt-2 text-[14px] leading-relaxed text-mute">{description}</div>
          </AlertPrimitive.Description>
          <div className="mt-6 flex justify-end gap-3">
            <AlertPrimitive.Cancel asChild>
              <Button variant="secondary">Cancel</Button>
            </AlertPrimitive.Cancel>
            <Button
              variant={tone === "danger" ? "danger" : "primary"}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                  setOpen(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertPrimitive.Content>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  );
}
