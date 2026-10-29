import { useId } from "react";
import { cn } from "@/lib/utils";

/** The infinity loop used by the mark, the countdown and the backdrop (viewBox 0 0 100 50). */
export const INFINITY_PATH =
  "M50 25 C41 10.5 15 8 15 25 C15 42 41 39.5 50 25 C59 10.5 85 8 85 25 C85 42 59 39.5 50 25 Z";

export function InfinityMark({ className, title }: { className?: string; title?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="8 6 84 38" className={cn("h-8 w-auto", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={`mk-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a07bff" />
          <stop offset="0.5" stopColor="#4d79ff" />
          <stop offset="1" stopColor="#2ae0f5" />
        </linearGradient>
      </defs>
      <path d={INFINITY_PATH} fill="none" stroke={`url(#mk-${id})`} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="85" cy="25" r="3.6" fill="#fff" />
    </svg>
  );
}

/**
 * Text logo: the infinity mark beside a stacked wordmark. "ALLIANCE ×" sits on
 * the first line; "INFINITY CLUB" on the second, in the brand gradient.
 */
export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const scale = {
    sm: { mark: "h-6", top: "text-[10px]", bottom: "text-[12px]", gap: "gap-2" },
    md: { mark: "h-9", top: "text-[12px]", bottom: "text-[15px]", gap: "gap-3" },
    lg: { mark: "h-14", top: "text-[16px]", bottom: "text-[22px]", gap: "gap-4" },
  }[size];
  return (
    <span className={cn("inline-flex items-center", scale.gap, className)} aria-label="ALLIANCE × INFINITY CLUB">
      <InfinityMark className={scale.mark} />
      <span className="flex flex-col whitespace-nowrap font-display leading-[1.05]" aria-hidden>
        <span className={cn("font-medium tracking-[0.18em] text-text", scale.top)}>
          ALLIANCE <span className="text-flux">×</span>
        </span>
        <span className={cn("font-bold tracking-[0.08em] brand-gradient-text", scale.bottom)}>INFINITY CLUB</span>
      </span>
    </span>
  );
}

/** The Alliance University crest, as supplied by the organisers. Shown unaltered, clipped to its circle. */
export function AllianceCrest({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/alliance-university.jpg"
      alt="Alliance University crest"
      className={cn("aspect-square rounded-full object-cover ring-1 ring-white/10", className)}
      width={512}
      height={512}
    />
  );
}
