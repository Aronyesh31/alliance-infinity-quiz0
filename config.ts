// Shared constants. Imported by the Next.js app, the realtime server and tests,
// so this file must stay free of framework- or runtime-specific imports.

export const BRAND_NAME = "ALLIANCE × INFINITY CLUB";

/** Standard event mode: every question lasts exactly this long. */
export const STANDARD_TIME_LIMIT_SEC = 60;
export const MIN_TIME_LIMIT_SEC = 10;
export const MAX_TIME_LIMIT_SEC = 300;

export const DEFAULT_POINTS = 1000;
export const MAX_POINTS = 2000;

export const MIN_CHOICES = 2;
export const MAX_CHOICES = 4;
export const MAX_QUESTIONS = 200;
export const QUESTION_TEXT_MAX = 500;
export const CHOICE_TEXT_MAX = 160;
export const EXPLANATION_MAX = 1000;
export const QUIZ_TITLE_MAX = 120;
export const QUIZ_DESCRIPTION_MAX = 500;

export const DEFAULT_CAPACITY = 500;
export const MIN_CAPACITY = 1;
export const MAX_CAPACITY = 2000;

export const DEFAULT_REVEAL_SECONDS = 5;
export const MAX_REVEAL_SECONDS = 30;

export const TEAM_NAME_MIN = 2;
export const TEAM_NAME_MAX = 24;

export const PIN_LENGTH = 8;

export const MIN_ADMIN_PASSWORD = 12;
export const MAX_ADMIN_PASSWORD = 256;

export const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
export const TEAM_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const REALTIME_TICKET_TTL_MS = 60 * 1000; // tickets only open a socket

export const PUBLIC_LEADERBOARD_SIZE = 10;

export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

export const isProduction = () => process.env.NODE_ENV === "production";

export const ADMIN_COOKIE = () => (isProduction() ? "__Host-aic_admin" : "aic_admin");
export const TEAM_COOKIE = () => (isProduction() ? "__Host-aic_team" : "aic_team");

export function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function appOrigin(): string {
  return (process.env.APP_ORIGIN ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function realtimePublicUrl(): string {
  return (process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:4000").replace(/\/+$/, "");
}

export function realtimeInternalUrl(): string {
  const internal = process.env.REALTIME_INTERNAL_URL?.trim();
  return (internal ? internal : realtimePublicUrl()).replace(/\/+$/, "");
}

export function sharedSecret(): string {
  const secret = process.env.REALTIME_SHARED_SECRET ?? "";
  if (secret.length < 32) {
    throw new Error("REALTIME_SHARED_SECRET must be set to at least 32 characters.");
  }
  return secret;
}
