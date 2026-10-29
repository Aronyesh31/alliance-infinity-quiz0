import { INFINITY_PATH } from "./logo";
import { cn } from "@/lib/utils";

/**
 * Large, slow infinity loop: a dim track with a bright comet orbiting it.
 * Pure SVG + CSS (stroke-dashoffset), and still when reduced motion is set.
 */
export function InfinityBackdrop({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 50" className={cn("pointer-events-none select-none", className)} aria-hidden>
      <defs>
        <linearGradient id="bd-trail" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8b5cff" />
          <stop offset="0.5" stopColor="#3d6bff" />
          <stop offset="1" stopColor="#22d8f0" />
        </linearGradient>
        <filter id="bd-glow" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
      <path d={INFINITY_PATH} fill="none" stroke="rgb(150 165 255 / 0.2)" strokeWidth="0.7" />
      <path
        d={INFINITY_PATH}
        fill="none"
        stroke="url(#bd-trail)"
        strokeWidth="2.4"
        strokeLinecap="round"
        pathLength={1000}
        strokeDasharray="220 780"
        filter="url(#bd-glow)"
        className="animate-orbit"
      />
      <path
        d={INFINITY_PATH}
        fill="none"
        stroke="url(#bd-trail)"
        strokeWidth="0.9"
        strokeLinecap="round"
        pathLength={1000}
        strokeDasharray="220 780"
        className="animate-orbit"
      />
    </svg>
  );
}
