import type { CategoryDTO, ProductExtra, ReviewDTO, Taxonomy } from "../domain/types";
import { productInputSchema } from "../domain/validators";
import type { ExportRow, ProductRepository } from "../repositories/product.repo";
import { COLOR_SLUGS } from "@/lib/constants";
import { foldVi, normalizeVi } from "@/lib/text";
import { parseCsv, toCsv } from "./csv";
import { classifyProduct, parseCount, parseShopeeUrl } from "./classify";
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
  /** ghi chu khong chan (tu phan loai, luu nhap vi thieu anh...) */
  notes: { line: number; message: string }[];
}

export interface ImportOptions {
  dryRun?: boolean;
  /** dung khi dong khong co / khong khop phong cach, the loai */
  defaultStyleId?: number | null;
  defaultCategoryId?: number | null;
}

/** Tao the loai con thieu (vd "Quà tặng", "Khác") tu bo danh muc mau; tra ve the loai da tao */
export type EnsureCategory = (slug: string) => Promise<CategoryDTO | null>;

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
  sold: ["da ban", "sold", "doanh thu", "luot ban", "so luong ban"],
  status: ["trang thai", "status"],
  badge: ["nhan", "badge"],
  commissionRate: ["ti le hoa hong", "ty le hoa hong", "% hoa hong", "commission rate", "commissionrate"],
  commissionAmount: ["hoa hong", "tien hoa hong", "commission", "commission amount", "commissionamount"],
  isFeatured: ["noi bat", "featured", "isfeatured"],
  stock: ["ton kho", "kho", "stock"],
  variants: ["phan loai", "bien the", "variants", "variant"],
  attributes: ["thuoc tinh", "chi tiet san pham", "attributes", "specs"],
  shop: ["shop", "ten shop", "cua hang", "ten cua hang", "seller", "shop name"],
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
  constructor(
    private admin: ProductAdminService,
    private getTaxonomy: () => Promise<Taxonomy>,
    private ensureCategory?: EnsureCategory,
  ) {}

  /** Tu nhan dang JSON hay CSV theo noi dung */
  async run(text: string, actorId: string, opts: ImportOptions = {}): Promise<ImportReport> {
    const trimmed = text.replace(/^﻿/, "").trim();
    return trimmed.startsWith("{") || trimmed.startsWith("[") ? this.runJson(trimmed, opts) : this.runCsv(text, opts);
  }

  private async runJson(text: string, opts: ImportOptions): Promise<ImportReport> {
    const report: ImportReport = { total: 0, created: 0, updated: 0, skipped: 0, errors: [], notes: [] };
    let data: unknown;
    try { data = JSON.parse(text); } catch (e) { report.errors.push({ line: 1, message: `JSON không hợp lệ: ${e instanceof Error ? e.message : ""}` }); return report; }
    const items = Array.isArray(data) ? data : isObj(data) && Array.isArray(data.products) ? data.products : isObj(data) ? [data] : [];
    if (!items.length) { report.errors.push({ line: 1, message: 'Không có sản phẩm. Dạng đúng: {"format":"eleonore.products.v1","products":[…]} hoặc mảng […]' }); return report; }
    const t = structuredClone(await this.getTaxonomy());
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

  private async runCsv(text: string, opts: ImportOptions): Promise<ImportReport> {
    const rows = parseCsv(text);
    const report: ImportReport = { total: 0, created: 0, updated: 0, skipped: 0, errors: [], notes: [] };
    if (rows.length < 2) { report.errors.push({ line: 1, message: "Tệp rỗng hoặc thiếu dòng dữ liệu" }); return report; }
    const rawHead = rows[0]!.map((h) => h.replace(/^\uFEFF/, "").trim());
    const head = rawHead.map((h) => canonKey(h));
    // phong cach / the loai khong bat buoc nua: thieu thi tu phan loai theo ten hoac dung mac dinh
    for (const must of ["name", "price"]) {
      if (!head.includes(must)) report.errors.push({ line: 1, message: `Thiếu cột bắt buộc: ${must === "name" ? "Tên sản phẩm" : "Giá"}` });
    }
    if (report.errors.length) {
      report.errors.push({ line: 1, message: `Các cột đọc được ở dòng 1: ${rawHead.filter(Boolean).slice(0, 12).join(" | ") || "(trống)"}. Tải “Template chuẩn (Excel)” rồi điền vào đó — đừng lưu lại dạng CSV bằng Excel vì dễ hỏng dấu tiếng Việt.` });
      return report;
    }
    const unknown = rawHead.filter((h, i) => h && !head[i]);
    if (unknown.length) report.notes.push({ line: 1, message: `Bỏ qua cột không nhận diện: ${unknown.join(", ")} (vẫn lưu trong dữ liệu gốc)` });
    const t = structuredClone(await this.getTaxonomy());
    for (let r = 1; r < rows.length; r++) {
      report.total++;
      await this.importOne(report, r + 1, t, () => {
        const canon: Obj = {};
        head.forEach((k, i) => { if (k && canon[k] === undefined) canon[k] = (rows[r]![i] ?? "").trim(); });
        // dong goc nguyen ban (de doi chieu) neu file khong co cot "Du lieu goc JSON"
        if (canon.raw === undefined || canon.raw === "") {
          const orig: Obj = {};
          rawHead.forEach((h, i) => { if (h) orig[h] = (rows[r]![i] ?? "").trim(); });
          canon.raw = orig;
        }
        return canon;
      }, opts);
    }
    return report;
  }

  /**
   * File bat ky (Shopee Affiliate, CSV tu lam...) -> CSV TEMPLATE CHUAN cua he thong (cung cot voi "Xuất CSV"),
   * da tu dien phong cach/the loai/loai, ma SP, shop, hoa hong... Cot con trong (Ảnh, Mô tả, Phân loại...) de tool cao dien tiep
   * roi nhap lai. Khong ghi DB.
   */
  async template(text: string, opts: ImportOptions = {}): Promise<{ csv: string; rows: (string | number | null)[][]; report: ImportReport }> {
    const report: ImportReport = { total: 0, created: 0, updated: 0, skipped: 0, errors: [], notes: [] };
    const trimmed = text.replace(/^\uFEFF/, "").trim();
    let items: Obj[] = [];
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const data: unknown = JSON.parse(trimmed);
        const arr = Array.isArray(data) ? data : isObj(data) && Array.isArray(data.products) ? data.products : [];
        items = arr.filter(isObj).map((it) => {
          const canon: Obj = {};
          for (const [k, v] of Object.entries(it)) { const ck = canonKey(k); if (ck && canon[ck] === undefined) canon[ck] = v; }
          if (canon.raw === undefined) canon.raw = it;
          return canon;
        });
      } catch { report.errors.push({ line: 1, message: "JSON không hợp lệ" }); }
    } else {
      const rows = parseCsv(text);
      const rawHead = (rows[0] ?? []).map((h) => h.replace(/^\uFEFF/, "").trim());
      const head = rawHead.map((h) => canonKey(h));
      if (!head.includes("name")) report.errors.push({ line: 1, message: "Thiếu cột Tên sản phẩm" });
      else items = rows.slice(1).map((row) => {
        const canon: Obj = {};
        head.forEach((k, i) => { if (k && canon[k] === undefined) canon[k] = (row[i] ?? "").trim(); });
        if (canon.raw === undefined || canon.raw === "") {
          const orig: Obj = {};
          rawHead.forEach((h, i) => { if (h) orig[h] = (row[i] ?? "").trim(); });
          canon.raw = orig;
        }
        return canon;
      });
    }
    const t = structuredClone(await this.getTaxonomy());
    const nameOf = <T extends { id: number; name: string }>(arr: T[], id: number | null) => arr.find((x) => x.id === id)?.name ?? "";
    const j = (v: unknown) => (v == null || v === "" || (isObj(v) && !Object.keys(v).length) ? "" : typeof v === "string" ? v : JSON.stringify(v));
    const body: (string | number | null)[][] = [];
    for (const [i, c] of items.entries()) {
      report.total++;
      const line = i + 2;
      try {
        if (str(c.name).length < 2) throw new Error("Thiếu tên sản phẩm");
        const price = num(c.price);
        if (price === null) throw new Error(`Giá không hợp lệ: "${str(c.price)}"`);
        const tax = await this.resolveTaxonomy(report, line, t, c, { ...opts, dryRun: true });
        const productUrl = str(c.productUrl);
        const ids = parseShopeeUrl(productUrl) ?? parseShopeeUrl(str(c.affiliateUrl));
        const pct = Number(str(c.commissionRate).replace(/%$/, "").replace(",", "."));
        const rate = Number.isFinite(pct) && pct > 0 && pct <= 100 ? pct : null;
        const soldText = str(c.sold);
        const detail: Obj = isObj(jsonCell(c.detail)) ? { ...(jsonCell(c.detail) as Obj) } : {};
        if (soldText && /[+k]|tr/i.test(soldText)) detail.soldText = soldText.slice(0, 60);
        body.push([
          str(c.itemId) || ids?.itemId || "", str(c.merchant) || (/shopee\./i.test(productUrl + str(c.affiliateUrl)) ? "shopee" : ""),
          str(c.name), str(c.slug), nameOf(t.styles, tax.styleId), nameOf(t.categories, tax.categoryId), nameOf(t.types, tax.typeId),
          price, num(c.originalPrice), list(c.colors).join("|"), list(c.sizes).join("|"), str(c.material), list(c.tags).join("|"),
          list(c.images, /[|;\n]/).join("|"), str(c.description), str(c.affiliateUrl), productUrl,
          str(c.rating), str(c.reviewCount), parseCount(c.sold) ?? "", str(c.status), str(c.badge),
          rate == null ? "" : `${rate}%`,
          // giu dung so tien Shopee bao (₫29.800); khong co thi uoc tinh = gia x ty le
          num(str(c.commissionAmount).replace(/[₫\s]/g, "")) ?? (rate == null ? "" : Math.round((price * rate) / 100)), str(c.isFeatured),
          str(c.stock), j(c.variants), j(c.attributes), isObj(c.shop) ? str(c.shop.name) : str(c.shop), isObj(c.video) ? str(c.video.url) : str(c.video),
          j(detail), j(c.reviews), j(isObj(c.raw) ? c.raw : jsonCell(c.raw)),
        ]);
      } catch (e) {
        report.skipped++;
        report.errors.push({ line, message: e instanceof Error ? e.message : "Lỗi" });
      }
    }
    report.created = body.length;
    return { csv: toCsv([[...CSV_HEAD], ...body]), rows: body, report };
  }

  /** phong cach / the loai / loai: cot trong file -> doan theo ten -> mac dinh -> the loai "Khac" */
  private async resolveTaxonomy(report: ImportReport, line: number, t: Taxonomy, c: Obj, opts: ImportOptions) {
    const byName = <T extends { name: string; slug: string }>(arr: T[], v: unknown) => {
      const label = isObj(v) ? str(v.slug) || str(v.name) : str(v);
      const n = normalizeVi(label);
      return { label, hit: n ? arr.find((x) => normalizeVi(x.name) === n || x.slug === n.replace(/ /g, "-")) : undefined };
    };
    const name = str(c.name);
    const guess = classifyProduct(name, t);
    const notes: string[] = [];

    // ---- the loai ----
    const ct0 = byName(t.categories, c.category);
    let category = ct0.hit;
    if (!category) {
      if (ct0.label) notes.push(`thể loại "${ct0.label}" chưa có`);
      category = t.categories.find((x) => x.id === guess.categoryId)
        ?? t.categories.find((x) => x.id === opts.defaultCategoryId)
        ?? (await this.ensure(t, "khac", opts));
      if (!category) throw new Error(`Không xác định được thể loại${ct0.label ? ` "${ct0.label}"` : ""} — chọn "Thể loại mặc định" khi nhập`);
      notes.push(guess.categoryId === category.id ? `tự xếp vào "${category.name}" (khớp "${guess.matched}")` : `xếp vào "${category.name}" (mặc định)`);
    }
    // ---- loai cu the ----
    const typesOfCat = t.types.filter((x) => x.categoryId === category!.id);
    const ty0 = byName(typesOfCat, c.type);
    if (ty0.label && !ty0.hit) throw new Error(`Loại "${ty0.label}" không thuộc thể loại "${category.name}"`);
    const typeId = ty0.hit?.id ?? (guess.categoryId === category.id ? guess.typeId : null);
    // ---- phong cach ----
    const st0 = byName(t.styles, c.style);
    let style = st0.hit;
    if (!style) {
      if (st0.label) notes.push(`phong cách "${st0.label}" chưa có`);
      style = t.styles.find((x) => x.id === guess.styleId) ?? t.styles.find((x) => x.id === opts.defaultStyleId) ?? t.styles[0];
      if (!style) throw new Error("Chưa có phong cách nào — tạo ít nhất 1 phong cách trước khi nhập");
      if (st0.label || !opts.defaultStyleId || style.id !== opts.defaultStyleId) notes.push(`phong cách "${style.name}"${guess.styleId === style.id ? " (khớp theo tên)" : " (mặc định)"}`);
    }
    if (notes.length) report.notes.push({ line, message: notes.join("; ") });
    return { styleId: style.id, categoryId: category.id, typeId };
  }

  /** the loai theo slug: co san -> dung; chua co -> tao tu danh muc mau (khong tao khi chay thu) */
  private async ensure(t: Taxonomy, slug: string, opts: ImportOptions): Promise<CategoryDTO | undefined> {
    const have = t.categories.find((x) => x.slug === slug);
    if (have) return have;
    if (!this.ensureCategory) return undefined;
    if (opts.dryRun) {
      // chay thu: gia lap id am de tiep tuc kiem tra cac truong khac
      const fake: CategoryDTO = { id: -1 - t.categories.length, slug, name: slug === "khac" ? "Khác" : slug, aliases: [], sortOrder: 999, isActive: true };
      t.categories.push(fake);
      return fake;
    }
    const created = await this.ensureCategory(slug);
    if (created) {
      t.categories.push(created);
      // nap lai loai cu the cua the loai vua tao
      const fresh = await this.getTaxonomy().catch(() => null);
      if (fresh) t.types.push(...fresh.types.filter((x) => x.categoryId === created.id && !t.types.some((y) => y.id === x.id)));
    }
    return created ?? undefined;
  }

  private async importOne(report: ImportReport, line: number, t: Taxonomy, get: () => Obj, opts: ImportOptions) {
    try {
      const c = get();
      if (str(c.name).length < 2) throw new Error("Thiếu tên sản phẩm");
      const price = num(c.price);
      if (price === null) throw new Error(`Giá không hợp lệ: "${str(c.price)}"`);
      const tax = await this.resolveTaxonomy(report, line, t, c, opts);

      // link Shopee -> ma san pham + shop id (file affiliate co san 2 link)
      const productUrl = str(c.productUrl);
      const ids = parseShopeeUrl(productUrl) ?? parseShopeeUrl(str(c.affiliateUrl));
      const itemId = str(c.itemId) || ids?.itemId || "";
      const hostMerchant = /shopee\./i.test(productUrl + str(c.affiliateUrl)) ? "shopee" : /tiktok/i.test(productUrl) ? "tiktok" : /lazada/i.test(productUrl) ? "lazada" : "";
      const merchantRaw = foldVi(str(c.merchant) || hostMerchant || "shopee");
      const merchant = (["shopee", "tiktok", "lazada"].find((m) => merchantRaw.includes(m)) ?? "other") as "shopee" | "tiktok" | "lazada" | "other";
      const colors = list(c.colors).map((x) => normalizeVi(x).replace(/ /g, "-")).filter((x) => COLOR_SLUGS.includes(x));

      // ---- chi tiet kieu Shopee: detail (JSON) lam goc, cot rieng le de len ----
      const detail: Obj = isObj(jsonCell(c.detail)) ? { ...(jsonCell(c.detail) as Obj) } : {};
      for (const k of EXTRA_KEYS) {
        let v = c[k];
        if (v === undefined || v === "") continue;
        if (typeof v === "string" && /^[[{]/.test(v.trim())) v = jsonCell(v) ?? v; // o CSV chua JSON (template / tool cao)
        // cot "Shop"/"Video" chi la ten/link -> khong ghi de object day du da co trong "Chi tiết JSON"
        if ((k === "shop" || k === "video") && typeof v === "string" && isObj(detail[k])) continue;
        detail[k] = v;
      }
      if ("variants" in detail) detail.variants = parseVariants(detail.variants);
      if ("attributes" in detail) detail.attributes = parseAttributes(detail.attributes);
      if (typeof detail.shop === "string") detail.shop = detail.shop ? { name: detail.shop, url: ids ? `https://shopee.vn/shop/${ids.shopId}` : null } : null;
      // "1k+" / "10k+" (Shopee affiliate) -> so + giu chu goc
      const soldText = str(c.sold);
      const sold = parseCount(c.sold);
      if (soldText && /[+k]|tr/i.test(soldText) && detail.soldText === undefined) detail.soldText = soldText.slice(0, 60);
      // hoa hong: "10,5%" -> 10.5; cot "Hoa hồng" cu (file xuat cu) co the chua ty le
      const pct = (v: unknown) => { const x = Number(str(v).replace(/%$/, "").replace(",", ".").trim()); return Number.isFinite(x) && x > 0 && x <= 100 ? x : null; };
      const amountRaw = str(c.commissionAmount);
      const commissionRate = str(c.commissionRate) ? pct(c.commissionRate) : !/₫|đ|vnd/i.test(amountRaw) ? pct(amountRaw) : null;
      const images = list(c.images, /[|;\n]/).slice(0, 5);
      const statusRaw = foldVi(str(c.status));
      const status = ["draft", "nhap"].includes(statusRaw) ? "draft" : ["archived", "luu tru", "an"].includes(statusRaw) ? "archived"
        : statusRaw ? "published" : images.length ? "published" : "draft";
      if (!statusRaw && !images.length) report.notes.push({ line, message: "chưa có ảnh → lưu Nháp (thêm ảnh hoặc chạy tool cào rồi nhập lại để hiển thị)" });
      if (typeof detail.video === "string") detail.video = detail.video ? { url: detail.video } : null;

      const reviewsRaw = jsonCell(c.reviews);
      const reviews = Array.isArray(reviewsRaw) ? reviewsRaw.map(normalizeReview).filter((x): x is Obj => x !== null) : undefined;
      const rawIn = jsonCell(c.raw);

      const parsed = productInputSchema.safeParse({
        name: str(c.name), slug: str(c.slug) || undefined, description: str(c.description), styleId: tax.styleId, categoryId: Math.abs(tax.categoryId), typeId: tax.typeId,
        price, originalPrice: num(c.originalPrice), colors, sizes: list(c.sizes), material: str(c.material),
        tags: list(c.tags), images, badge: str(c.badge) || null,
        rating: Math.min(5, Number(str(c.rating).replace(",", ".")) || 0), reviewCount: num(c.reviewCount) ?? reviews?.filter((x) => x.source !== "similar").length ?? 0,
        sold: sold ?? 0, merchant, affiliateUrl: str(c.affiliateUrl), productUrl, itemId: itemId || null,
        commissionRate, status,
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
      // the loai gia lap (chay thu, chua tao) -> bo qua buoc doi chieu danh muc
      if (opts.dryRun && tax.categoryId < 0) { existing ? report.updated++ : report.created++; return; }
      const w = await this.admin.prepare(v, existing?.id, t);
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

export const CSV_HEAD = [
  "Mã sản phẩm", "Sàn bán", "Tên sản phẩm", "Slug", "Phong cách", "Thể loại", "Loại", "Giá", "Giá gốc", "Màu", "Size", "Chất liệu", "Tags", "Ảnh",
  "Mô tả", "Link affiliate", "Link sản phẩm", "Điểm đánh giá", "Số đánh giá", "Đã bán", "Trạng thái", "Nhãn", "Tỉ lệ hoa hồng", "Hoa hồng", "Nổi bật",
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
    return toCsv([[...CSV_HEAD], ...this.toRows(rows)]);
  }

  /** Cac dong theo dung thu tu CSV_HEAD (dung chung cho CSV va Excel) */
  toRows(rows: ExportRow[]): (string | number | null)[][] {
    const j = (v: unknown) => (v == null || (isObj(v) && !Object.keys(v).length) || (Array.isArray(v) && !v.length) ? "" : JSON.stringify(v));
    return rows.map((r) => {
      const d = r.detail;
      return [
        r.itemId, r.merchant, r.name, r.slug, r.style.name, r.category.name, r.type?.name ?? "", r.price, r.originalPrice, r.colors.join("|"), r.sizes.join("|"),
        r.material, r.tags.join("|"), r.images.join("|"), r.description, r.affiliateUrl, r.productUrl, r.rating, r.reviewCount, r.sold, r.status,
        r.badge, r.commissionRate == null ? "" : `${r.commissionRate}%`,
        r.commissionRate == null ? "" : Math.round((r.price * Number(r.commissionRate)) / 100), r.isFeatured ? "x" : "", d.stock ?? "",
        (d.variants ?? []).map((g) => `${g.name}: ${g.options.map((o) => o.name).join("|")}`).join("; "),
        (d.attributes ?? []).map((a) => `${a.label}: ${a.value}`).join("; "), d.shop?.name ?? "", d.video?.url ?? "",
        j(d), j(r.reviews.map(reviewOut)), j(r.rawData),
      ];
    });
  }
}
