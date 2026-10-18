import * as cheerio from "cheerio";

export interface PageFacts {
  url: string; host: string; title: string; description: string;
  jsonLd: Record<string, unknown>[]; text: string; images: string[];
}

const BAD_IMG = /(sprite|logo|icon|avatar|pixel|tracking|blank|placeholder|badge|\.svg(\?|$)|\.gif(\?|$)|data:)/i;
const abs = (src: string | undefined, base: string) => {
  if (!src) return null;
  try { const u = new URL(src, base); return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null; } catch { return null; }
};

function flattenLd(node: unknown, out: Record<string, unknown>[]) {
  if (Array.isArray(node)) return node.forEach((n) => flattenLd(n, out));
  if (!node || typeof node !== "object") return;
  const o = node as Record<string, unknown>;
  if (o["@graph"]) flattenLd(o["@graph"], out);
  const t = String(o["@type"] ?? "");
  if (/Product|Article|BlogPosting|Review/i.test(t)) out.push(o);
}

/** Lay thong tin co cau truc (JSON-LD, OpenGraph) + van ban chinh + anh ung vien tu HTML. */
export function extractPage(html: string, url: string, maxText = 6000): PageFacts {
  const $ = cheerio.load(html);
  const meta = (n: string) => $(`meta[property="${n}"], meta[name="${n}"]`).attr("content")?.trim() ?? "";
  const jsonLd: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try { flattenLd(JSON.parse($(el).text()), jsonLd); } catch { /* JSON-LD hong -> bo qua */ }
  });
  const images: string[] = [];
  const push = (v: string | null) => { if (v && !BAD_IMG.test(v) && !images.includes(v)) images.push(v); };
  push(abs(meta("og:image"), url));
  for (const ld of jsonLd) {
    const im = ld.image;
    for (const i of Array.isArray(im) ? im : [im]) push(abs(typeof i === "string" ? i : (i as { url?: string } | null)?.url, url));
  }
  $("script,style,noscript,nav,footer,header,aside,form,iframe,svg").remove();
  const root = $("article").first().length ? $("article").first() : $("main").first().length ? $("main").first() : $("body");
  root.find("img").each((_, el) => {
    const w = Number($(el).attr("width") ?? 0);
    if (w && w < 200) return;
    push(abs($(el).attr("data-src") ?? $(el).attr("src"), url));
  });
  const text = root.text().replace(/\s+/g, " ").trim().slice(0, maxText);
  const host = new URL(url).hostname.replace(/^www\./, "");
  return {
    url, host, title: (meta("og:title") || $("title").first().text()).trim().slice(0, 200),
    description: (meta("og:description") || meta("description")).slice(0, 400),
    jsonLd: jsonLd.slice(0, 3).map((o) => JSON.parse(JSON.stringify(o, (_k, v) => (typeof v === "string" ? v.slice(0, 400) : v)))),
    text, images: images.slice(0, 8),
  };
}
