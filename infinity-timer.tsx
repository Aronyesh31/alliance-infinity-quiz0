"use client";

import { useEffect, useId, useRef, useState } from "react";
import { INFINITY_PATH } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

interface Props {
  /** Server-clock epoch ms when answers close. */
  deadline: number | null;
  /** Full question length in ms (for the fraction lit). */
  totalMs: number;
  /** Estimated server-clock offset (serverNow − Date.now()). */
  offsetMs: number;
  /** When paused, the frozen remaining time. */
  frozenMs?: number | null;
  layout?: "stacked" | "inline";
  className?: string;
  numberClassName?: string;
}

/**
 * The countdown, drawn as an infinity loop whose light drains as time runs out.
 * Driven by requestAnimationFrame against the server clock, so every screen
 * shows the same time regardless of when it loaded.
 */
export function InfinityTimer({ deadline, totalMs, offsetMs, frozenMs = null, layout = "stacked", className, numberClassName }: Props) {
  const litRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGPathElement>(null);
  const cometRef = useRef<SVGCircleElement>(null);
  const [seconds, setSeconds] = useState(() => Math.ceil((frozenMs ?? Math.max(0, (deadline ?? 0) - Date.now() - offsetMs)) / 1000));
  const [urgent, setUrgent] = useState(false);
  const uid = useId().replace(/:/g, "");

  useEffect(() => {
    let raf = 0;
    const path = litRef.current;
    const total = path?.getTotalLength() ?? 0;
    const frame = () => {
      const remaining = frozenMs ?? (deadline === null ? 0 : Math.max(0, deadline - (Date.now() + offsetMs)));
      const fraction = totalMs > 0 ? Math.min(1, remaining / totalMs) : 0;
      const lit = fraction * 1000;
      litRef.current?.setAttribute("stroke-dasharray", `${lit} 1000`);
      glowRef.current?.setAttribute("stroke-dasharray", `${lit} 1000`);
      if (cometRef.current && path) {
        const p = path.getPointAtLength(fraction * total);
        cometRef.current.setAttribute("cx", String(p.x));
        cometRef.current.setAttribute("cy", String(p.y));
        cometRef.current.style.opacity = fraction > 0 ? "1" : "0";
      }
      const s = Math.ceil(remaining / 1000);
      setSeconds((prev) => (prev === s ? prev : s));
      setUrgent(remaining <= 10_000);
      if (frozenMs === null && remaining > 0) raf = requestAnimationFrame(frame);
    };
    frame();
    return () => cancelAnimationFrame(raf);
  }, [deadline, totalMs, offsetMs, frozenMs]);

  return (
    <div
      className={cn("flex items-center", layout === "stacked" ? "flex-col gap-1" : "flex-row gap-3", className)}
      role="timer"
      aria-live="off"
      aria-label={`${seconds} seconds left`}
    >
      <svg viewBox="8 6 84 38" className={cn(layout === "stacked" ? "w-full" : "h-10 w-auto")} aria-hidden>
        <defs>
          <linearGradient id={`tg-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={urgent ? "#ff5c7c" : "#a07bff"} />
            <stop offset="0.5" stopColor={urgent ? "#e44fd2" : "#4d79ff"} />
            <stop offset="1" stopColor={urgent ? "#ff5c7c" : "#2ae0f5"} />
          </linearGradient>
          <filter id={`tf-${uid}`} x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="1.8" />
          </filter>
        </defs>
        <path d={INFINITY_PATH} fill="none" stroke="rgb(150 165 255 / 0.16)" strokeWidth="5" strokeLinecap="round" />
        <path ref={glowRef} d={INFINITY_PATH} fill="none" stroke={`url(#tg-${uid})`} strokeWidth="5" strokeLinecap="round" pathLength={1000} strokeDasharray="1000 1000" filter={`url(#tf-${uid})`} opacity="0.8" />
        <path ref={litRef} d={INFINITY_PATH} fill="none" stroke={`url(#tg-${uid})`} strokeWidth="5" strokeLinecap="round" pathLength={1000} strokeDasharray="1000 1000" />
        <circle ref={cometRef} r="3.2" fill="#fff" cx="50" cy="25" />
      </svg>
      <span
        className={cn(
          "font-display font-semibold tabular leading-none transition-colors",
          urgent ? "text-bad" : "text-text",
          numberClassName,
        )}
      >
        {seconds}
        <span className="ml-0.5 text-[0.45em] font-medium text-mute">s</span>
      </span>
    </div>
  );
}
