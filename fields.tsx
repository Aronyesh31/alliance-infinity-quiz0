import * as React from "react";
import { Label as LabelPrimitive, Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-[10px] border border-line bg-night/80 px-3.5 text-[15px] text-text placeholder:text-faint transition-colors focus-visible:border-ion-soft/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ion/30 disabled:opacity-50 aria-[invalid=true]:border-bad/70";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBase, "h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%239aa4cf%22><path d=%22M5.5 7.5 10 12l4.5-4.5%22 stroke=%22%239aa4cf%22 stroke-width=%221.6%22 fill=%22none%22/></svg>')] bg-[length:18px] bg-[right_12px_center] bg-no-repeat pr-10", className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root className={cn("text-[13px] font-medium text-mute", className)} {...props} />;
}

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-line-strong bg-night p-0.5 transition-colors data-[state=checked]:border-transparent data-[state=checked]:bg-volt disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-[18px] rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-5" />
    </SwitchPrimitive.Root>
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-[13px] text-bad">
      {children}
    </p>
  );
}
