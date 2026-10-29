import { randomInt } from "node:crypto";
import { PIN_LENGTH } from "../config";

/**
 * Cryptographically random 8-digit PIN (never starts with 0): 90,000,000
 * possibilities. Combined with tight limits on failed lookups, guessing an
 * active PIN is impractical.
 */
export function generatePin(): string {
  const min = 10 ** (PIN_LENGTH - 1);
  const max = 10 ** PIN_LENGTH;
  return String(randomInt(min, max));
}

/** Accepts "1234 5678", "1234-5678" etc. Returns null if not a valid PIN shape. */
export function normalizePin(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const digits = input.replace(/[\s-]/g, "");
  if (!/^\d+$/.test(digits) || digits.length !== PIN_LENGTH || digits.startsWith("0")) return null;
  return digits;
}

export function formatPin(pin: string): string {
  return pin.length === 8 ? `${pin.slice(0, 4)} ${pin.slice(4)}` : pin;
}
