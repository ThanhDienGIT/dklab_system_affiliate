import type { ProductExtra, ReviewDTO, Taxonomy } from "../domain/types";
import { productInputSchema } from "../domain/validators";
import type { ExportRow, ProductRepository } from "../repositories/product.repo";
import { COLOR_SLUGS } from "@/lib/constants";
import { foldVi, normalizeVi } from "@/lib/text";
import { parseCsv, toCsv } from "./csv";
import type { ProductAdminService } from "./product-admin.service";

/**
 * CHUAN VAO/RA SAN PHAM (dung cho cao du lieu + xuat/nhap):
 *  - JSON: { "format": "eleonore.products.v1", "products": [ {...} ] } hoac mang tran [ {...} ]
 *  - CSV : 1 dong = 1 san pham; cot tieng Viet hoac tieng Anh (xem HEADERS)
 * Cung 1 bo truong cho ca hai; JSON giu day du (bien the, thuoc tinh, shop, danh gia, raw).
 * Khoa chong trung: (san ban + ma san pham) -> slug.
 */
export const EXPORT_FORMAT = "eleonore.products.v1";

export interface ImportReport {
  total: number; created: number; updated: number; skipped: number;
  errors: { line: number; message: string }[];
}

const HEADERS: Record<string, string[]> = {
  name: ["ten san pham", "ten", "name", "product name", "title"],
  slug: ["slug", "duong dan"],
  style: ["phong cach", "style", "stylename", "style slug"],
  category: ["the loai", "danh muc", "category", "category slug"],
  type: ["loai", "loai cu the", "type", "product type", "type slug"],
  price: ["gia", "gia ban", "price", "sale price"],
  originalPrice: ["gia goc", "original price", "gia niem yet", "originalprice"],
  colors: ["mau", "mau sac", "colors", "color"],
  sizes: ["size", "sizes", "kich co"],
  material: ["chat lieu", "material"],
  tags: ["tu khoa", "tags", "tag"],
  images: ["anh", "anh url", "hinh anh", "images", "image url", "image"],
  description: ["mo ta", "description"],
  affiliateUrl: ["link affiliate", "affiliate url", "link uu dai", "affiliate", "product link", "link", "affiliateurl"],
  productUrl: ["link san pham", "product url", "url", "producturl"],
  merchant: ["san ban", "merchant", "nen tang", "platform"],
  itemId: ["item id", "ma san pham", "itemid", "sku"],
  rating: ["diem danh gia", "rating", "sao", "danh gia sao"],
  reviewCount: ["so danh gia", "review count", "reviewcount", "luot danh gia"],
  sold: ["da ban", "sold"],
  status: ["trang thai", "status"],
  badge: ["nhan", "badge"],
  commissionRate: ["hoa hong", "commission rate", "commission", "commissionrate"],
  isFeatured: ["noi bat", "featured", "isfeatured"],
  stock: ["ton kho", "kho", "stock"],
  variants: ["phan loai", "bien the", "variants", "variant"],
  attributes: ["thuoc tinh", "chi tiet san pham", "attributes", "specs"],
  shop: ["shop", "ten shop", "cua hang", "seller"],
  video: ["video", "video url"],
  detail: ["chi tiet json", "detail", "detail json", "detailjson"],
  reviews: ["danh gia json", "reviews", "reviews json", "reviewsjson", "binh luan"],
  raw: ["du lieu goc json", "raw", "raw json", "rawjson", "raw data", "rawdata"],
};

/** "185.000₫" | "89k" | "1tr2" | "185000" -> 185000 */
export function parseMoney(raw: string | undefined): number | null {
  if (!raw) return null;
  const s = foldVi(raw).replace(/\s+/g, "").replace(/(vnd|dong|d|₫)$/i, "");
  let m = /^(\d+)(?:tr|m)(\d)?$/.exec(s);
  if (m) return Math.round((Number(m[1]) + Number(m[2] ?? 0) / 10) * 1e6);
  m = /^(\d+(?:[.,]\d+)?)(k|nghin|ngan)$/.exec(s);
  if (m) return Math.round(Number(m[1]!.replace(",", ".")) * 1000);
  m = /^(\d+(?:[.,]\d+)?)(tr|trieu|m)$/.exec(s);
  if (m) return Math.round(Number(m[1]!.replace(",", ".")) * 1e6);
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ""));
  if (/^\d+$/.test(s)) return Number(s);
  return null;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown) => (v == null ? "" : typeof v === "object" ? "" : String(v).trim());
const list = (v: unknown, seps = /[|;,]/): string[] =>
  Array.isArray(v) ? v.map(str).filter(Boolean) : str(v).split(seps).map((x) => x.trim()).filter(Boolean);
const num = (v: unknown): number | null => (typeof v === "number" ? (Number.isFinite(v) ? Math.round(v) : null) : parseMoney(str(v)));
const jsonCell = (v: unknown): unknown => {
  if (typeof v !== "string") return v;
  const s = v.trim();
  if (!s) return undefined;
  try { return JSON.parse(s); } catch { return undefined; }
};

/** Doi ten khoa bat ky (tieng Viet/Anh, camelCase) -> khoa chuan */
const KEY_INDEX = (() => {
  const m = new Map<string, string>();
  for (const [key, aliases] of Object.entries(HEADERS)) {
    m.set(key.toLowerCase(), key);
    for (const a of aliases) m.set(a.replace(/\s+/g, ""), key), m.set(a, key);
  }
  return m;
})();
export function canonKey(k: string): string | undefined {
  return KEY_INDEX.get(normalizeVi(k)) ?? KEY_INDEX.get(normalizeVi(k).replace(/\s+/g, "")) ?? KEY_INDEX.get(k.toLowerCase().replace(/[_\s-]/g, ""));
}

/** "Màu sắc: Be|Nâu ; Size: 35|36" -> nhom bien the */
function parseVariants(v: unknown): ProductExtra["variants"] | undefined {
  if (Array.isArray(v)) {
    const out = v.map((g) => {
      if (!isObj(g)) return null;
      const opts = (Array.isArray(g.options) ? g.options : []).map((o) => (isObj(o) ? { name: str(o.name), image: str(o.image) || null } : { name: str(o), image: null })).filter((o) => o.name);
      return str(g.name) && opts.length ? { name: str(g.name), options: opts } : null;
    }).filter((g): g is NonNullable<typeof g> => g !== null);
    return out;
  }
  const s = str(v);
  if (!s) return undefined;
  return s.split(/;|\n/).map((part) => {
    const i = part.indexOf(":");
    if (i < 1) return null;
    const options = part.slice(i + 1).split("|").map((x) => x.trim()).filter(Boolean).map((name) => ({ name, image: null }));
    return options.length ? { name: part.slice(0, i).trim(), options } : null;
  }).filter((g): g is NonNullable<typeof g> => g !== null);
}

/** "Chất liệu: Da; Xuất xứ: Trung Quốc" -> [{label,value}] */
function parseAttributes(v: unknown): ProductExtra["attributes"] | undefined {
  if (Array.isArray(v)) return v.map((a) => (isObj(a) ? { label: str(a.label ?? a.name), value: str(a.value) } : null)).filter((a): a is { label: string; value: string } => Boolean(a?.label));
  if (isObj(v)) return Object.entries(v).map(([label, value]) => ({ label, value: str(value) })).filter((a) => a.label);
  const s = str(v);
  if (!s) return undefined;
  return s.split(/;|\n/).map((part) => {
    const i = part.indexOf(":");
    return i < 1 ? null : { label: part.slice(0, i).trim(), value: part.slice(i + 1).trim() };
  }).filter((a): a is { label: string; value: string } => a !== null);
}

const EXTRA_KEYS = ["stock", "likeCount", "soldText", "video", "variants", "attributes", "sourcePath", "shipping", "guarantees", "shop", "ratingBreakdown"] as const;

/** Mot danh gia tho (nhieu kieu khoa) -> dang chuan */
export function normalizeReview(o: unknown): Obj | null {
  if (!isObj(o)) return null;
  const pick = (...keys: string[]) => { for (const k of keys) if (o[k] !== undefined && o[k] !== null && o[k] !== "") return o[k]; return undefined; };
  const rawTime = pick("reviewedAt", "time", "date", "ctime", "created_at", "createdAt");
  const reviewedAt = typeof rawTime === "number" ? new Date(rawTime < 1e12 ? rawTime * 1000 : rawTime).toISOString() : rawTime;
  const mediaIn = pick("media");
  const media = Array.isArray(mediaIn)
    ? mediaIn.map((m) => (isObj(m) ? { type: str(m.type) === "video" ? "video" : "image", url: str(m.url), duration: str(m.duration) || null } : { type: "image", url: str(m), duration: null })).filter((m) => m.url)
    : [
      ...list(pick("images", "photos"), /[|;\n]/).map((url) => ({ type: "image", url, duration: null })),
      ...list(pick("videos"), /[|;\n]/).map((url) => ({ type: "video", url, duration: null })),
    ];
  const reply = pick("sellerReply", "reply", "seller_reply");
  return {
    author: str(pick("author", "user", "username", "ten", "buyer")), rating: pick("rating", "star", "stars", "sao") ?? 5,
    content: str(pick("content", "comment", "text", "binh luan")), variant: str(pick("variant", "phan loai", "model")) || null,
    reviewedAt, media, sellerReply: isObj(reply) ? str(reply.content ?? reply.comment) || null : str(reply) || null,
    likes: pick("likes", "like", "useful") ?? 0, source: str(pick("source", "type")) === "similar" ? "similar" : "own",
  };
}

export class ImportService {
  constructor(private admin: ProductAdminService, private getTaxonomy: () => Promise<Taxonomy>) {}

  /** Tu nhan dang JSON hay CSV theo noi dung */
  async run(text: string, actorId: string, opts: { dryRun?: boolean } = {}): Promise<ImportReport> {
    const trimmed = text.replace(/^﻿/, "").trim();
    return trimmed.startsWith("{") || trimmed.startsWith("[") ? this.runJson(trimmed, opts) : this.runCsv(text, opts);
  }

  private async runJson(text: string, opts: { dryRun?: boolean }): Promise<ImportReport> {
    const report: ImportReport = { total: 0, created: 0, updated: 0, skipped: 0, errors: [] };
    let data: unknown;
    try { data = JSON.parse(text); } catch (e) { report.errors.push({ line: 1, message: `JSON không hợp lệ: ${e instanceof Error ? e.message : ""}` }); return report; }
    const items = Array.isArray(data) ? data : isObj(data) && Array.isArray(data.products) ? data.products : isObj(data) ? [data] : [];
    if (!items.length) { report.errors.push({ line: 1, message: 'Không có sản phẩm. Dạng đúng: {"format":"eleonore.products.v1","products":[…]} hoặc mảng […]' }); return report; }
    const t = await this.getTaxonomy();
    for (const [i, it] of items.entries()) {
      report.total++;
      await this.importOne(report, i + 1, t, () => {
        if (!isObj(it)) throw new Error("Phần tử không phải object");
        const canon: Obj = {};
        for (const [k, v] of Object.entries(it)) {
          const ck = canonKey(k);
          if (ck && canon[ck] === undefined) canon[ck] = v;
        }
        // JSON goc nguyen ban (de doi chieu sau nay): uu tien truong raw neu co
        if (canon.raw === undefined) canon.raw = it;
        return canon;
      }, opts);
    }
    return report;
  }

  private async runCsv(text: string, opts: { dryRun?: boolean }): Promise<ImportReport> {
    const rows = parseCsv(text);
    const report: ImportReport = { total: 0, created: 0, updated: 0, skipped: 0, errors: [] };
    if (rows.length < 2) { report.errors.push({ line: 1, message: "Tệp rỗng hoặc thiếu dòng dữ liệu" }); return report; }
    const head = rows[0]!.map((h) => canonKey(h));
    for (const must of ["name", "price", "style", "category"]) {
      if (!head.includes(must)) report.errors.push({ line: 1, message: `Thiếu cột bắt buộc: ${must}` });
    }
    if (report.errors.length) return report;
    const t = await this.getTaxonomy();
    for (let r = 1; r < rows.length; r++) {
      report.total++;
      await this.importOne(report, r + 1, t, () => {
        const canon: Obj = {};
        head.forEach((k, i) => { if (k && canon[k] === undefined) canon[k] = (rows[r]![i] ?? "").trim(); });
        return canon;
      }, opts);
    }
    return report;
  }

  private async importOne(report: ImportReport, line: number, t: Taxonomy, get: () => Obj, opts: { dryRun?: boolean }) {
    try {
      const c = get();
      const byName = <T extends { name: string; slug: string }>(arr: T[], v: unknown) => {
        const label = isObj(v) ? str(v.slug) || str(v.name) : str(v);
        const n = normalizeVi(label);
        return { label, hit: n ? arr.find((x) => normalizeVi(x.name) === n || x.slug === n.replace(/ /g, "-")) : undefined };
      };
      const st = byName(t.styles, c.style);
      const ct = byName(t.categories, c.category);
      if (!st.hit) throw new Error(`Phong cách "${st.label}" không có trong danh mục`);
      if (!ct.hit) throw new Error(`Thể loại "${ct.label}" không có trong danh mục`);
      const ty = byName(t.types.filter((x) => x.categoryId === ct.hit!.id), c.type);
      if (ty.label && !ty.hit) throw new Error(`Loại "${ty.label}" không thuộc thể loại "${ct.hit.name}"`);
      const price = num(c.price);
      if (price === null) throw new Error(`Giá không hợp lệ: "${str(c.price)}"`);

      const merchantRaw = foldVi(str(c.merchant) || "shopee");
      const merchant = (["shopee", "tiktok", "lazada"].find((m) => merchantRaw.includes(m)) ?? "other") as "shopee" | "tiktok" | "lazada" | "other";
      const statusRaw = foldVi(str(c.status));
      const colors = list(c.colors).map((x) => normalizeVi(x).replace(/ /g, "-")).filter((x) => COLOR_SLUGS.includes(x));

      // ---- chi tiet kieu Shopee: detail (JSON) lam goc, cot rieng le de len ----
      const detail: Obj = isObj(jsonCell(c.detail)) ? { ...(jsonCell(c.detail) as Obj) } : {};
      for (const k of EXTRA_KEYS) if (c[k] !== undefined && c[k] !== "") detail[k] = c[k];
      if ("variants" in detail) detail.variants = parseVariants(detail.variants);
      if ("attributes" in detail) detail.attributes = parseAttributes(detail.attributes);
      if (typeof detail.shop === "string") detail.shop = detail.shop ? { name: detail.shop } : null;
      if (typeof detail.video === "string") detail.video = detail.video ? { url: detail.video } : null;

      const reviewsRaw = jsonCell(c.reviews);
      const reviews = Array.isArray(reviewsRaw) ? reviewsRaw.map(normalizeReview).filter((x): x is Obj => x !== null) : undefined;
      const rawIn = jsonCell(c.raw);

      const parsed = productInputSchema.safeParse({
        name: str(c.name), slug: str(c.slug) || undefined, description: str(c.description), styleId: st.hit.id, categoryId: ct.hit.id, typeId: ty.hit?.id ?? null,
        price, originalPrice: num(c.originalPrice), colors, sizes: list(c.sizes), material: str(c.material),
        tags: list(c.tags), images: list(c.images, /[|;\n]/).slice(0, 5), badge: str(c.badge) || null,
        rating: Math.min(5, Number(str(c.rating).replace(",", ".")) || 0), reviewCount: num(c.reviewCount) ?? reviews?.filter((x) => x.source !== "similar").length ?? 0,
        sold: num(c.sold) ?? 0, merchant, affiliateUrl: str(c.affiliateUrl), productUrl: str(c.productUrl), itemId: str(c.itemId) || null,
        commissionRate: str(c.commissionRate) ? Number(str(c.commissionRate).replace(",", ".").replace("%", "")) || null : null,
        status: ["draft", "nhap"].includes(statusRaw) ? "draft" : ["archived", "luu tru", "an"].includes(statusRaw) ? "archived" : "published",
        isFeatured: c.isFeatured === true || ["true", "1", "x", "co"].includes(foldVi(str(c.isFeatured))),
        detail, rawData: isObj(rawIn) ? rawIn : undefined, reviews,
      });
      if (!parsed.success) {
        const iss = parsed.error.issues[0];
        throw new Error(`${iss?.path.join(".") ? iss.path.join(".") + ": " : ""}${iss?.message ?? "Dữ liệu sai"}`);
      }
      const v = parsed.data;
      for (const url of [v.affiliateUrl, v.productUrl]) {
        if (url && !/^https?:\/\//i.test(url)) throw new Error("Link phải bắt đầu bằng http(s)://");
      }
      // chong trung: (san ban, item id) truoc, sau do toi slug
      const existing = (v.itemId ? await this.admin.findByItemId(v.merchant, v.itemId) : null)
        ?? (v.slug ? await this.admin.findBySlug(v.slug) : null);
      const w = await this.admin.prepare(v, existing?.id);
      if (opts.dryRun) { existing ? report.updated++ : report.created++; return; }
      await this.admin.upsertWrite(existing?.id ?? null, w);
      existing ? report.updated++ : report.created++;
    } catch (e) {
      report.skipped++;
      report.errors.push({ line, message: e instanceof Error ? e.message : "Lỗi không xác định" });
    }
  }
}

/* ============================ XUAT ============================ */

const CSV_HEAD = [
  "Mã sản phẩm", "Sàn bán", "Tên sản phẩm", "Slug", "Phong cách", "Thể loại", "Loại", "Giá", "Giá gốc", "Màu", "Size", "Chất liệu", "Tags", "Ảnh",
  "Mô tả", "Link affiliate", "Link sản phẩm", "Điểm đánh giá", "Số đánh giá", "Đã bán", "Trạng thái", "Nhãn", "Hoa hồng", "Nổi bật",
  "Tồn kho", "Phân loại", "Thuộc tính", "Shop", "Video", "Chi tiết JSON", "Đánh giá JSON", "Dữ liệu gốc JSON",
] as const;

const reviewOut = (r: ReviewDTO) => ({
  author: r.author, rating: r.rating, content: r.content, variant: r.variant, reviewedAt: r.reviewedAt,
  media: r.media, sellerReply: r.sellerReply, likes: r.likes, source: r.source,
});

/** Dang chuan de xuat/nhap lai (1 san pham) */
export function toExportItem(r: ExportRow) {
  return {
    itemId: r.itemId, merchant: r.merchant, name: r.name, slug: r.slug,
    style: r.style.slug, category: r.category.slug, type: r.type?.slug ?? null,
    price: r.price, originalPrice: r.originalPrice, description: r.description, material: r.material,
    colors: r.colors, sizes: r.sizes, tags: r.tags, images: r.images, badge: r.badge,
    rating: r.rating, reviewCount: r.reviewCount, sold: r.sold, affiliateUrl: r.affiliateUrl, productUrl: r.productUrl,
    commissionRate: r.commissionRate, status: r.status, isFeatured: r.isFeatured,
    detail: r.detail, reviews: r.reviews.map(reviewOut), raw: r.rawData,
  };
}

export class ExportService {
  constructor(private products: ProductRepository) {}

  rows(f: { ids?: number[]; status?: "draft" | "published" | "archived" } = {}) { return this.products.exportRows(f); }

  toJson(rows: ExportRow[]): string {
    return JSON.stringify({ format: EXPORT_FORMAT, exportedAt: new Date().toISOString(), count: rows.length, products: rows.map(toExportItem) }, null, 2);
  }

  toCsv(rows: ExportRow[]): string {
    const j = (v: unknown) => (v == null || (isObj(v) && !Object.keys(v).length) || (Array.isArray(v) && !v.length) ? "" : JSON.stringify(v));
    const body = rows.map((r) => {
      const d = r.detail;
      return [
        r.itemId, r.merchant, r.name, r.slug, r.style.name, r.category.name, r.type?.name ?? "", r.price, r.originalPrice, r.colors.join("|"), r.sizes.join("|"),
        r.material, r.tags.join("|"), r.images.join("|"), r.description, r.affiliateUrl, r.productUrl, r.rating, r.reviewCount, r.sold, r.status,
        r.badge, r.commissionRate, r.isFeatured ? "x" : "", d.stock ?? "",
        (d.variants ?? []).map((g) => `${g.name}: ${g.options.map((o) => o.name).join("|")}`).join("; "),
        (d.attributes ?? []).map((a) => `${a.label}: ${a.value}`).join("; "), d.shop?.name ?? "", d.video?.url ?? "",
        j(d), j(r.reviews.map(reviewOut)), j(r.rawData),
      ];
    });
    return toCsv([[...CSV_HEAD], ...body]);
  }
}
