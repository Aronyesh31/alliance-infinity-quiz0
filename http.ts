import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";
import { appOrigin, isProduction } from "./config";

export function json<T>(data: T, init?: number | ResponseInit) {
  const base = typeof init === "number" ? { status: init } : (init ?? {});
  return NextResponse.json(data, {
    ...base,
    headers: { "Cache-Control": "no-store", ...(base.headers ?? {}) },
  });
}

export function apiError(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return json({ ok: false, code, message, ...extra }, status);
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly headers?: Record<string, string>,
  ) {
    super(message);
  }
}

/** Wraps a route handler so thrown ApiErrors become JSON responses. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ApiError) {
        const issues = (error as ApiError & { issues?: unknown }).issues;
        return json(
          { ok: false, code: error.code, message: error.message, ...(issues ? { issues } : {}) },
          { status: error.status, headers: error.headers },
        );
      }
      console.error("[api] unhandled error", error);
      return apiError(500, "server_error", "Something went wrong on our side. Try again.");
    }
  };
}

/**
 * CSRF defence for state-changing requests: the browser-supplied Origin must
 * match the app's own origin. Combined with SameSite cookies and JSON-only
 * bodies (which force a CORS preflight cross-site), forged requests fail.
 */
export function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  const allowed = new Set([appOrigin()]);
  if (!isProduction()) {
    allowed.add(req.nextUrl.origin);
    const host = req.headers.get("host");
    if (host) allowed.add(`http://${host}`);
  }
  if (!origin || !allowed.has(origin.replace(/\/+$/, ""))) {
    throw new ApiError(403, "bad_origin", "This request was blocked because it did not come from this site.");
  }
}

export async function readJson<S extends z.ZodType>(req: NextRequest, schema: S, maxBytes = 512 * 1024): Promise<z.infer<S>> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new ApiError(415, "bad_content_type", "Send JSON.");
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > maxBytes) throw new ApiError(413, "too_large", "That request is too large.");
  const text = await req.text();
  if (text.length > maxBytes) throw new ApiError(413, "too_large", "That request is too large.");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ApiError(400, "bad_json", "The request body is not valid JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new ApiError(400, "invalid", first?.message ?? "Invalid request.");
  }
  return parsed.data;
}

/**
 * Client IP for rate limiting. Vercel and most proxies put the real client
 * first in X-Forwarded-For; x-real-ip is Vercel's single-value header.
 */
export function clientIp(req: NextRequest): string {
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

export function rateLimited(retryAfterSec: number, message: string) {
  return new ApiError(429, "rate_limited", message, { "Retry-After": String(retryAfterSec) });
}
