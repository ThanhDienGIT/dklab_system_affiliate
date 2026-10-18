import type { Taxonomy } from "../domain/types";
import { foldVi, normalizeVi } from "@/lib/text";

/**
 * Doan phong cach / the loai / loai cu the tu TEN san pham (dung khi file nhap khong co cot tuong ung,
 * vd file "Lay link san pham hang loat" cua Shopee Affiliate).
 *  - Ten the loai/loai co dau -> so khop CO DAU (tranh "giấy" ~ "giày", "đẹp" ~ "dép").
 *  - Bi danh khong dau -> chi dung khi du "dac trung": >= 2 tu, hoac >= 6 ky tu, hoac co chu so.
 *  - Diem = do dai cum khop (+3 neu la loai cu the); hoa -> uu tien vi tri xuat hien som hon.
 */
export interface Classified {
  styleId: number | null;
  categoryId: number | null;
  typeId: number | null;
  /** cum tu da khop (de bao cao) */
  matched?: string;
}

const strong = (alias: string) => alias.includes(" ") || alias.length >= 6 || /\d/.test(alias);

function find(hay: { lower: string; folded: string }, needle: string, accent: boolean): number {
  const h = accent ? hay.lower : hay.folded;
  const n = accent ? needle.toLowerCase().normalize("NFC") : needle;
  if (!n) return -1;
  // ranh gioi tu: khong dinh chu/so o hai dau
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[^\\p{L}\\p{N}])`, "u");
  const m = re.exec(h);
  return m ? m.index + m[1]!.length : -1;
}

export function classifyProduct(name: string, t: Pick<Taxonomy, "styles" | "categories" | "types">): Classified {
  const hay = {
    lower: name.toLowerCase().normalize("NFC").replace(/\s+/g, " "),
    folded: normalizeVi(name),
  };
  let best: { score: number; pos: number; categoryId: number; typeId: number | null; matched: string } | null = null;
  const consider = (score: number, pos: number, categoryId: number, typeId: number | null, matched: string) => {
    if (pos < 0) return;
    if (!best || score > best.score || (score === best.score && pos < best.pos)) best = { score, pos, categoryId, typeId, matched };
  };

  for (const ty of t.types) {
    consider(ty.name.length + 3, find(hay, ty.name, true), ty.categoryId, ty.id, ty.name);
    for (const a of ty.aliases) if (strong(a)) consider(a.length + 3, find(hay, normalizeVi(a), false), ty.categoryId, ty.id, a);
  }
  for (const c of t.categories) {
    consider(c.name.length, find(hay, c.name, true), c.id, null, c.name);
    for (const a of c.aliases) if (strong(a)) consider(a.length, find(hay, normalizeVi(a), false), c.id, null, a);
  }

  let styleId: number | null = null;
  let styleScore = 0;
  for (const s of t.styles) {
    for (const k of [s.name, ...s.keywords]) {
      const key = normalizeVi(k);
      if (key.length < 3) continue;
      if (find(hay, key, false) >= 0 && key.length > styleScore) { styleId = s.id; styleScore = key.length; }
    }
  }
  const b = best as { categoryId: number; typeId: number | null; matched: string } | null;
  return { styleId, categoryId: b?.categoryId ?? null, typeId: b?.typeId ?? null, matched: b?.matched };
}

/** "1k+" | "10k+" | "1,2tr" | "100k+" | "90" | "1.234" -> so nguyen; khong hieu -> null */
export function parseCount(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : null;
  const s = foldVi(String(raw ?? "")).replace(/\s+/g, "").replace(/\+$/, "").replace(/(daban|luot)$/, "");
  if (!s) return null;
  const m = /^(\d+(?:[.,]\d+)?)(k|tr|trieu|m)?$/.exec(s);
  if (m) {
    const n = Number(m[1]!.replace(",", "."));
    const mul = m[2] === "k" ? 1e3 : m[2] ? 1e6 : 1;
    if (!m[2] && /^\d{1,3}([.,]\d{3})+$/.test(m[1]!)) return Number(m[1]!.replace(/[.,]/g, ""));
    return Math.round(n * mul);
  }
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ""));
  return null;
}

/** https://shopee.vn/product/{shopId}/{itemId} | https://shopee.vn/ten-sp-i.{shopId}.{itemId} */
export function parseShopeeUrl(url: string): { shopId: string; itemId: string } | null {
  const m = /\/product\/(\d+)\/(\d+)/.exec(url) ?? /-i\.(\d+)\.(\d+)/.exec(url) ?? /[?&]shopid=(\d+).*[?&]itemid=(\d+)/i.exec(url);
  return m ? { shopId: m[1]!, itemId: m[2]! } : null;
}
