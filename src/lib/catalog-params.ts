import { COLOR_SLUGS, PAGE_SIZE, SORTS, type SortKey } from "./constants";
import type { ProductFilter } from "@/server/domain/types";

export type RawParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v: string | undefined) => { const n = Number(v); return v && Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined; };

export interface CatalogState {
  type?: string; colors: string[]; min?: number; max?: number; sort: SortKey; page: number; style?: string; category?: string;
}

/** Doc tham so URL (loai, mau, min, max, sort, trang, pc = phong cach, tl = the loai) */
export function parseCatalogParams(sp: RawParams, defaultSort: SortKey = "popular"): CatalogState {
  const sort = one(sp.sort);
  const colors = (one(sp.mau) ?? "").split(",").map((s) => s.trim()).filter((c) => COLOR_SLUGS.includes(c)).slice(0, 6);
  const page = Math.max(1, Math.min(500, num(one(sp.trang)) ?? 1));
  return {
    type: one(sp.loai)?.slice(0, 80) || undefined, colors, min: num(one(sp.min)), max: num(one(sp.max)),
    sort: (SORTS.some((s) => s.value === sort) ? sort : defaultSort) as SortKey, page,
    style: one(sp.pc)?.slice(0, 80) || undefined, category: one(sp.tl)?.slice(0, 80) || undefined,
  };
}

export function stateToFilter(s: CatalogState, base: ProductFilter = {}): ProductFilter {
  return {
    ...base,
    typeSlug: s.type ?? base.typeSlug,
    styleSlug: base.styleSlug ?? s.style,
    categorySlug: base.categorySlug ?? s.category,
    colors: s.colors.length ? s.colors : undefined,
    priceMin: s.min, priceMax: s.max,
    sort: s.sort, page: s.page, pageSize: PAGE_SIZE,
  };
}

/** Dung URL moi tu state hien tai + thay doi; bo tham so rong, ve trang 1 khi doi bo loc */
export function buildHref(path: string, s: CatalogState, patch: Partial<Record<keyof CatalogState, unknown>> = {}, defaultSort: SortKey = "popular"): string {
  const m = { ...s, ...patch } as CatalogState;
  const q = new URLSearchParams();
  if (m.type) q.set("loai", m.type);
  if (m.colors?.length) q.set("mau", m.colors.join(","));
  if (m.min !== undefined) q.set("min", String(m.min));
  if (m.max !== undefined) q.set("max", String(m.max));
  if (m.sort && m.sort !== defaultSort) q.set("sort", m.sort);
  if (m.style) q.set("pc", m.style);
  if (m.category) q.set("tl", m.category);
  if (m.page && m.page > 1) q.set("trang", String(m.page));
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}
