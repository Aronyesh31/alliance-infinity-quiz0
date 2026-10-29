import { Check, X } from "lucide-react";
import { cn, choiceLetter } from "@/lib/utils";

/** Fixed answer palette. Letters always accompany colour, so colour is never the only cue. */
export const CHOICE_COLORS = [
  { solid: "#8b5cff", soft: "rgb(139 92 255 / 0.16)", fill: "rgb(139 92 255 / 0.32)", edge: "rgb(139 92 255 / 0.34)", ink: "#ffffff" },
  { solid: "#3d6bff", soft: "rgb(61 107 255 / 0.16)", fill: "rgb(61 107 255 / 0.32)", edge: "rgb(61 107 255 / 0.36)", ink: "#ffffff" },
  { solid: "#22d8f0", soft: "rgb(34 216 240 / 0.14)", fill: "rgb(34 216 240 / 0.26)", edge: "rgb(34 216 240 / 0.32)", ink: "#04121a" },
  { solid: "#e44fd2", soft: "rgb(228 79 210 / 0.15)", fill: "rgb(228 79 210 / 0.3)", edge: "rgb(228 79 210 / 0.34)", ink: "#ffffff" },
] as const;

export type ChoiceTone = "idle" | "selected" | "dimmed" | "correct" | "wrong" | "faded";

interface Props {
  index: number;
  text: string;
  tone?: ChoiceTone;
  size?: "phone" | "screen" | "compact";
  /** 0–1 share of answers, drawn as a bar on the presentation screen after reveal. */
  share?: number | null;
  count?: number | null;
  as?: "button" | "div";
  onClick?: () => void;
  disabled?: boolean;
}

export function AnswerChoice({ index, text, tone = "idle", size = "phone", share = null, count = null, as = "div", onClick, disabled }: Props) {
  const c = CHOICE_COLORS[index % CHOICE_COLORS.length];
  const Comp = as;
  const filled = tone === "selected";
  const isCorrect = tone === "correct";
  const isWrong = tone === "wrong";

  return (
    <Comp
      {...(as === "button" ? { type: "button" as const, onClick, disabled, "aria-pressed": filled } : {})}
      className={cn(
        "group relative flex w-full items-center overflow-hidden border-2 text-left transition-[opacity,transform,background-color,border-color,box-shadow] duration-200",
        size === "phone" && "min-h-[68px] gap-3.5 rounded-[18px] px-3.5 py-3",
        size === "screen" && "min-h-[92px] gap-5 rounded-[22px] px-5 py-4",
        size === "compact" && "min-h-12 gap-3 rounded-xl px-3 py-2",
        as === "button" && !disabled && "cursor-pointer active:scale-[0.985]",
        (tone === "dimmed" || tone === "faded") && "opacity-35",
      )}
      style={{
        borderColor: isCorrect ? "var(--color-good)" : isWrong ? "var(--color-bad)" : filled ? c.solid : c.edge,
        background: filled ? c.fill : "rgb(16 24 59 / 0.85)",
        boxShadow: filled ? `0 0 0 4px ${c.soft}, 0 12px 30px -12px ${c.solid}` : isCorrect ? "0 0 0 4px rgb(49 227 168 / 0.18)" : undefined,
      }}
    >
      {share !== null ? (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 transition-[width] duration-700 ease-out"
          style={{ width: `${Math.round(share * 100)}%`, background: c.soft }}
        />
      ) : null}
      <span
        className={cn(
          "relative grid shrink-0 place-items-center font-display font-bold",
          size === "phone" && "size-11 rounded-xl text-[18px]",
          size === "screen" && "size-14 rounded-2xl text-[24px]",
          size === "compact" && "size-8 rounded-lg text-[14px]",
        )}
        style={{ background: c.solid, color: c.ink }}
        aria-hidden
      >
        {choiceLetter(index)}
      </span>
      <span
        className={cn(
          "relative flex-1 font-semibold leading-snug [overflow-wrap:anywhere]",
          size === "phone" && "text-[18px]",
          size === "screen" && "text-[clamp(1.25rem,2.1vw,2rem)]",
          size === "compact" && "text-[15px]",
        )}
      >
        <span className="sr-only">Answer {choiceLetter(index)}: </span>
        {text}
      </span>
      {count !== null ? <span className="relative font-display text-[clamp(1.1rem,1.6vw,1.6rem)] font-semibold tabular text-text">{count}</span> : null}
      {isCorrect ? <Check className="relative size-7 shrink-0 text-good" aria-label="Correct answer" /> : null}
      {isWrong ? <X className="relative size-7 shrink-0 text-bad" aria-label="Your answer" /> : null}
    </Comp>
  );
}
