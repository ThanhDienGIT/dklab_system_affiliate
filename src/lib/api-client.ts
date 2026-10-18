/** Goi API JSON; nem Error co .fields de form hien loi theo tung o */
export class ApiError extends Error {
  constructor(message: string, readonly code: string, readonly fields?: Record<string, string>) { super(message); }
}

let refreshing: Promise<boolean> | null = null;
/** Gia han phien (access token 15 phut) bang refresh token; gop nhieu loi goi dong thoi thanh 1 */
function refreshSession(): Promise<boolean> {
  refreshing ??= fetch("/api/auth/refresh", { method: "POST", cache: "no-store" })
    .then((r) => r.ok || r.status === 409).catch(() => false) // 409: request song song vua gia han
    .finally(() => { setTimeout(() => { refreshing = null; }, 2000); });
  return refreshing;
}

export async function apiFetch<T = unknown>(url: string, init?: { method?: string; body?: unknown; form?: FormData }): Promise<T> {
  return request<T>(url, init, true);
}

async function request<T>(url: string, init: { method?: string; body?: unknown; form?: FormData } | undefined, retry: boolean): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? (init?.body || init?.form ? "POST" : "GET"),
    headers: init?.form ? undefined : init?.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: init?.form ?? (init?.body !== undefined ? JSON.stringify(init.body) : undefined),
    cache: "no-store",
  });
  let data: unknown = null;
  try { data = await res.json(); } catch { /* khong co body */ }
  if (res.status === 401 && retry && !url.startsWith("/api/auth/") && (await refreshSession())) return request<T>(url, init, false);
  if (!res.ok) {
    const e = (data as { error?: { message?: string; code?: string; fields?: Record<string, string> } } | null)?.error;
    throw new ApiError(e?.message ?? "Có lỗi xảy ra, vui lòng thử lại", e?.code ?? "INTERNAL", e?.fields);
  }
  return data as T;
}

/** Tai tep (xlsx/csv...) ve may; tu gia han phien 1 lan neu 401. Tra ve ten tep + header bao cao (neu co) */
export async function downloadFile(url: string, init?: { method?: string; form?: FormData }): Promise<{ name: string; report: unknown }> {
  const go = () => fetch(url, { method: init?.method ?? "GET", body: init?.form, cache: "no-store" });
  let res = await go();
  if (res.status === 401 && (await refreshSession())) res = await go();
  if (!res.ok) {
    const data = await res.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new ApiError(data?.error?.message ?? "Tải tệp thất bại", "INTERNAL");
  }
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "tep-tai-ve";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  let report: unknown = null;
  try { report = JSON.parse(decodeURIComponent(res.headers.get("x-import-report") ?? "")); } catch { /* khong co */ }
  return { name, report };
}
