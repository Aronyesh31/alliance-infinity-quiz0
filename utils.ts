import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const choiceLetter = (i: number) => String.fromCharCode(65 + i);

export function formatDuration(ms: number | null | undefined) {
  if (ms === null || ms === undefined) return "—";
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatDateTime(d: Date | string | number) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d));
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`;
}
