"use client";

export interface ApiResult<T = Record<string, unknown>> {
  ok: boolean;
  status: number;
  data: T & { message?: string; code?: string; issues?: { questionIndex: number | null; field: string; message: string }[] };
}

/** JSON fetch against this app's own API (same origin, cookies included). */
export async function api<T = Record<string, unknown>>(url: string, init?: { method?: string; body?: unknown }): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: init?.method ?? (init?.body ? "POST" : "GET"),
      headers: init?.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as ApiResult<T>["data"];
    if (res.status === 401 && url.startsWith("/api/admin") && !url.endsWith("/login")) {
      window.location.assign("/admin/login");
    }
    return { ok: res.ok && (data as { ok?: boolean }).ok !== false, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { message: "Can't reach the server. Check your connection." } as ApiResult<T>["data"] };
  }
}
