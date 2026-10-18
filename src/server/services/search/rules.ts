import type { SearchPlan, Taxonomy } from "@/server/domain/types";
import type { SortKey } from "@/lib/constants";
import { foldVi, normalizeVi } from "@/lib/text";
import { parsePrice } from "./price";

/** Bo phan tich bang luat (deterministic, khong goi mang) - la nen va cung la du phong khi Gemini loi. */

const STOP = new Set((
  "tim kiem kiem cho toi minh em muon can mua xem nhung cac cai chiec con bo mot nao gi la va voi co khong o tai kieu dang loai mau " +
  "phong cach style do gia duoi tren tu den khoang tam re nhat hang san pham shop goi y ve cua the di nen dep hot moi duoc nhe a oi " +
  "nao nay kia thi ma de roi giup giong nhu thoi trang mac"
).split(" "));

const COLOR_WORDS: Record<string, string[]> = {
  den: ["den", "black"], trang: ["trang", "white"], kem: ["kem", "cream", "ivory"], be: ["mau be", "tone be", "beige"],
  nau: ["nau", "brown"], hong: ["hong", "pink"], tim: ["tim", "purple"], xanh: ["xanh", "blue", "navy"],
  vang: ["vang", "gold"], bac: ["bac", "silver"], "nhieu-mau": ["nhieu mau", "da sac", "rainbow"],
};

const SORT_HINTS: { re: RegExp; sort?: SortKey; onSale?: boolean }[] = [
  { re: /\b(ban chay|best ?seller|hot nhat|pho bien)\b/, sort: "bestseller" },
  { re: /\b(moi nhat|moi ve|hang moi|new arrival)\b/, sort: "newest" },
  { re: /\b(giam gia|khuyen mai|sale|uu dai)\b/, sort: "discount", onSale: true },
  { re: /\b(re nhat|gia re|binh dan|sinh vien|tiet kiem|thap nhat)\b/, sort: "price_asc" },
  { re: /\b(dat nhat|cao nhat|sang chanh|cao cap)\b/, sort: "price_desc" },
];

interface Alias { text: string; kind: "style" | "category" | "type"; slug: string; categorySlug?: string }

export function buildAliasIndex(t: Taxonomy): Alias[] {
  const out: Alias[] = [];
  const catSlugById = new Map(t.categories.map((c) => [c.id, c.slug]));
  const push = (kind: Alias["kind"], slug: string, list: string[], categorySlug?: string) => {
    for (const raw of new Set(list)) {
      const text = normalizeVi(raw);
      if (text.length >= 2) out.push({ text, kind, slug, categorySlug });
    }
  };
  for (const s of t.styles) push("style", s.slug, [s.name, s.slug, ...s.keywords]);
  for (const c of t.categories) push("category", c.slug, [c.name, c.slug, ...c.aliases]);
  for (const ty of t.types) push("type", ty.slug, [ty.name, ty.slug, ...ty.aliases], catSlugById.get(ty.categoryId));
  // Alias dai truoc -> khop cum cu the truoc cum chung ("dam babydoll" truoc "dam")
  return out.sort((a, b) => b.text.length - a.text.length);
}

export function parseQuery(query: string, taxonomy: Taxonomy, index = buildAliasIndex(taxonomy)): SearchPlan {
  const original = query.toLowerCase();
  const price = parsePrice(query);
  let n = ` ${normalizeVi(price.cleaned)} `;

  const plan: SearchPlan = { colors: [], keywords: [] };
  if (price.min !== undefined) plan.priceMin = price.min;
  if (price.max !== undefined) plan.priceMax = price.max;

  // tin hieu sap xep / giam gia
  for (const h of SORT_HINTS) {
    if (h.re.test(n)) {
      plan.sort ??= h.sort;
      if (h.onSale) plan.onSale = true;
      n = n.replace(h.re, " ");
    }
  }

  // phan loai: loai cu the -> phong cach -> the loai (kieu nao dai nhat khop truoc)
  const claim = (kind: Alias["kind"]) => {
    for (const a of index) {
      if (a.kind !== kind) continue;
      const needle = ` ${a.text} `;
      if (!n.includes(needle)) continue;
      n = n.replace(needle, "  ");
      return a;
    }
    return undefined;
  };
  const ty = claim("type");
  const st = claim("style");
  const ca = claim("category");
  if (st) plan.styleSlug = st.slug;
  if (ty) { plan.typeSlug = ty.slug; plan.categorySlug = ty.categorySlug ?? ca?.slug; }
  else if (ca) plan.categorySlug = ca.slug;

  // mau sac ("do" co dau de tranh nham voi "do"=dong phuc)
  for (const [slug, words] of Object.entries(COLOR_WORDS)) {
    for (const w of words) {
      const needle = ` ${w} `;
      if (n.includes(needle)) { plan.colors.push(slug); n = n.replace(needle, " "); break; }
    }
  }
  if (/đỏ/.test(original) || /\b(mau do|red)\b/.test(foldVi(original))) {
    if (!plan.colors.includes("do")) plan.colors.push("do");
    n = n.replace(/ (mau do|red) /g, " ");
  }

  plan.keywords = n.trim().split(/\s+/).filter((w) => w && !STOP.has(w) && !/^\d+$/.test(w) && w.length > 1);
  if (!plan.sort) plan.sort = plan.keywords.length ? "relevance" : undefined;
  return plan;
}

/** Ke hoach da du "co cau truc" de khoi phai hoi LLM? (tiet kiem do tre + chi phi) */
export function isSelfExplained(p: SearchPlan): boolean {
  const structured = Boolean(p.styleSlug || p.categorySlug || p.typeSlug || p.priceMin !== undefined || p.priceMax !== undefined || p.colors.length);
  return structured && p.keywords.length === 0;
}
