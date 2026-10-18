import { AppError } from "../../domain/errors";

export interface SearchHit { url: string; title: string; snippet: string }
export interface SearchProvider { readonly name: string; search(q: string, n: number): Promise<SearchHit[]> }

export function tavily(key: string, fetcher: typeof fetch = fetch): SearchProvider {
  return {
    name: "tavily",
    async search(q, n) {
      const res = await fetcher("https://api.tavily.com/search", {
        method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({ query: q, max_results: n, search_depth: "basic", include_answer: false }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new AppError("INTERNAL", `Tavily lỗi HTTP ${res.status}`);
      const j = (await res.json()) as { results?: { url: string; title: string; content?: string }[] };
      return (j.results ?? []).map((r) => ({ url: r.url, title: r.title, snippet: (r.content ?? "").slice(0, 300) }));
    },
  };
}

export function googleCse(key: string, cx: string, fetcher: typeof fetch = fetch): SearchProvider {
  return {
    name: "google-cse",
    async search(q, n) {
      const u = new URL("https://www.googleapis.com/customsearch/v1");
      u.search = new URLSearchParams({ key, cx, q, num: String(Math.min(n, 10)), lr: "lang_vi" }).toString();
      const res = await fetcher(u, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new AppError("INTERNAL", `Google Search lỗi HTTP ${res.status}`);
      const j = (await res.json()) as { items?: { link: string; title: string; snippet?: string }[] };
      return (j.items ?? []).map((r) => ({ url: r.link, title: r.title, snippet: (r.snippet ?? "").slice(0, 300) }));
    },
  };
}

/** Moi trang web (host) chi lay 1 ket qua de doi chieu cheo nhieu nguon khac nhau; bo qua cac san/mang xa hoi kho cao. */
const SKIP = /(^|\.)(shopee|lazada|tiktok|facebook|instagram|youtube|pinterest|twitter|x)\.(vn|com)$/i;
export function pickDistinct(hits: SearchHit[], n: number, excludeHosts: string[] = []): SearchHit[] {
  const seen = new Set<string>(); const out: SearchHit[] = [];
  for (const h of hits) {
    let host: string;
    try { host = new URL(h.url).hostname.replace(/^www\./, ""); } catch { continue; }
    if (seen.has(host) || SKIP.test(host) || excludeHosts.includes(host)) continue;
    seen.add(host); out.push(h);
    if (out.length >= n) break;
  }
  return out;
}
