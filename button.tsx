import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[background,box-shadow,color,transform,opacity] duration-150 disabled:pointer-events-none disabled:opacity-45 active:translate-y-px [&_svg]:size-[1.1em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "brand-gradient text-white shadow-[0_8px_28px_-10px_rgb(91_92_255/0.8),inset_0_1px_0_rgb(255_255_255/0.25)] hover:shadow-[0_10px_34px_-8px_rgb(91_92_255/0.95),inset_0_1px_0_rgb(255_255_255/0.3)]",
        secondary: "border border-line-strong bg-white/[0.03] text-text hover:bg-white/[0.07] hover:border-ion-soft/50",
        ghost: "text-mute hover:text-text hover:bg-white/[0.05]",
        danger: "bg-bad/90 text-white hover:bg-bad shadow-[0_8px_24px_-12px_rgb(255_92_124/0.9)]",
        dangerOutline: "border border-bad/40 text-bad hover:bg-bad/10",
        quiet: "bg-raise/70 text-text hover:bg-raise",
      },
      size: {
        sm: "h-8 rounded-lg px-3 text-[13px]",
        md: "h-10 rounded-[10px] px-4 text-[14px]",
        lg: "h-12 rounded-xl px-6 text-[16px]",
        xl: "h-14 rounded-2xl px-8 text-[17px]",
        icon: "size-9 rounded-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
