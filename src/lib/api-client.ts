/** Goi API JSON; nem Error co .fields de form hien loi theo tung o */
export class ApiError extends Error {
  constructor(message: string, readonly code: string, readonly fields?: Record<string, string>) { super(message); }
}

export async function apiFetch<T = unknown>(url: string, init?: { method?: string; body?: unknown; form?: FormData }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? (init?.body || init?.form ? "POST" : "GET"),
    headers: init?.form ? undefined : init?.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: init?.form ?? (init?.body !== undefined ? JSON.stringify(init.body) : undefined),
    cache: "no-store",
  });
  let data: unknown = null;
  try { data = await res.json(); } catch { /* khong co body */ }
  if (!res.ok) {
    const e = (data as { error?: { message?: string; code?: string; fields?: Record<string, string> } } | null)?.error;
    throw new ApiError(e?.message ?? "Có lỗi xảy ra, vui lòng thử lại", e?.code ?? "INTERNAL", e?.fields);
  }
  return data as T;
}
