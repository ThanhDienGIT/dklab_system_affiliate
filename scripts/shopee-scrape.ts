/**
 * TOOL CAO SHOPEE (chay tren may ban, KHONG chay tren Vercel)
 *
 *   pnpm scrape:shopee <file.csv|file.xlsx> [tuy chon]
 *
 * Dau vao : file Shopee Affiliate "Lay link san pham hang loat" HOAC template chuan (nut "Xuất template chuẩn để cào").
 * Dau ra  : thu muc scrape-out/  ->  <ten>-<thoi gian>.csv (template chuan, nhap lai o /admin/nhap-du-lieu)
 *                                  + .json (eleonore.products.v1) + cache/<itemId>.json (chay lai se bo qua SP da cao)
 *
 * Cach hoat dong: mo Chrome THAT tren may (profile rieng trong .shopee-profile/), vao tung trang san pham va BAT
 * cac phan hoi JSON ma chinh trang Shopee goi (get_pc, get_ratings) -> lay anh, mo ta, gia goc, phan loai,
 * thuoc tinh, shop, danh gia, video. Khong goi API truc tiep nen it bi chan. Lan dau: dang nhap Shopee tren cua so
 * Chrome hien ra (tool tu doi). Gap captcha: giai tay, tool tu chay tiep.
 *
 * Tuy chon:
 *   --out <dir>        thu muc ket qua (mac dinh scrape-out)
 *   --limit <n>        chi cao n san pham dau
 *   --delay <a-b>      nghi ngau nhien giua 2 san pham, giay (mac dinh 5-10)
 *   --reviews <n>      so danh gia lay moi san pham (mac dinh 20, 0 = bo qua)
 *   --images <n>       so anh toi da (mac dinh 5 - gioi han cua he thong)
 *   --fresh            bo qua cache, cao lai tat ca
 *   --headless         chay an (de bi chan hon - chi dung khi da dang nhap on dinh)
 *   --chrome <path>    duong dan chrome.exe neu khong tu tim thay
 *   --login            chi mo Shopee de dang nhap roi thoat
 */
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { parseCsv, toCsv } from "../src/server/services/csv";
import { ImportService, EXPORT_FORMAT, canonKey } from "../src/server/services/import.service";
import { parseShopeeUrl } from "../src/server/services/classify";
import { readUpload } from "../src/server/services/spreadsheet";
import { SEED_CATEGORIES, SEED_STYLES } from "../src/server/seed-data/taxonomy";
import type { Taxonomy } from "../src/server/domain/types";

/* ----------------------------- tham so ----------------------------- */
const argv = process.argv.slice(2);
const flag = (k: string) => argv.includes(`--${k}`);
const opt = (k: string, d = "") => { const i = argv.indexOf(`--${k}`); return i >= 0 && argv[i + 1] && !argv[i + 1]!.startsWith("--") ? argv[i + 1]! : d; };
const input = argv.find((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1]!.startsWith("--") && !["--fresh", "--headless", "--login"].includes(argv[i - 1]!)));
const OUT = path.resolve(opt("out", "scrape-out"));
const LIMIT = Number(opt("limit", "0")) || Infinity;
const [DMIN, DMAX] = opt("delay", "5-10").split("-").map(Number) as [number, number];
const REVIEWS = Math.max(0, Number(opt("reviews", "20")) || 0);
const MAX_IMG = Math.min(5, Math.max(1, Number(opt("images", "5")) || 5));
const PROFILE = path.resolve(".shopee-profile");

const log = (...a: unknown[]) => console.log(new Date().toLocaleTimeString("vi-VN"), ...a);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const exists = (p: string) => access(p).then(() => true, () => false);

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const s = (v: unknown) => (v == null || typeof v === "object" ? "" : String(v).trim());

/* ------------------------- doc JSON Shopee ------------------------- */
/** tim khoa dau tien (BFS) - chiu duoc thay doi cau truc API qua cac phien ban */
function deep(o: unknown, key: string, maxDepth = 6): unknown {
  let level: unknown[] = [o];
  for (let d = 0; d <= maxDepth && level.length; d++) {
    const next: unknown[] = [];
    for (const x of level) {
      if (Array.isArray(x)) { next.push(...x.slice(0, 50)); continue; }
      if (!isObj(x)) continue;
      if (key in x && x[key] != null && x[key] !== "") return x[key];
      next.push(...Object.values(x));
    }
    level = next;
  }
  return undefined;
}
const img = (h: unknown) => { const v = s(h); return !v ? "" : /^https?:/.test(v) ? v : `https://down-vn.img.susercontent.com/file/${v}`; };
/** gia Shopee nhan 100000 (29.800.000.000 = 298.000d); chap nhan object {single_value, range_min} */
function money(v: unknown): number | null {
  if (isObj(v)) return money(v.single_value ?? v.range_min ?? v.value ?? v.price);
  const n = typeof v === "number" ? v : Number(s(v));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n >= 1e8 ? n / 1e5 : n);
}

interface Scraped {
  images: string[]; description: string; price: number | null; originalPrice: number | null;
  rating: number | null; reviewCount: number | null; sold: number | null; stock: number | null; likeCount: number | null;
  variants: { name: string; options: { name: string; image: string | null }[] }[];
  attributes: { label: string; value: string }[]; sourcePath: { name: string; url: string | null }[];
  shop: Obj | null; video: { url: string; poster: string | null } | null;
  ratingBreakdown: Obj | null; reviews: Obj[]; brand: string; via: string[];
}

function fromPdp(pdp: Obj, out: Scraped) {
  const data = isObj(pdp.data) ? pdp.data : pdp;
  const item = (isObj(data.item) ? data.item : deep(data, "item")) as Obj | undefined ?? data;
  const imgs = (deep(data, "product_images") as Obj | undefined)?.images ?? item.images ?? deep(data, "images");
  if (Array.isArray(imgs)) out.images = imgs.map(img).filter(Boolean);
  out.description = s(item.description ?? deep(data, "description"));
  const priceObj = deep(data, "product_price") as Obj | undefined;
  out.price = money(priceObj?.price) ?? money(item.price_min ?? item.price);
  out.originalPrice = money(priceObj?.price_before_discount) ?? money(item.price_before_discount ?? item.price_min_before_discount);
  const rv = (deep(data, "product_review") as Obj | undefined) ?? (item.item_rating as Obj | undefined) ?? {};
  const star = Number(rv.rating_star ?? deep(item, "rating_star"));
  if (Number.isFinite(star) && star > 0) out.rating = Math.round(star * 10) / 10;
  const rc = (rv.rating_count ?? deep(item, "rating_count")) as unknown;
  if (Array.isArray(rc) && rc.length >= 6) {
    out.reviewCount = Number(rc[0]) || null;
    out.ratingBreakdown = { star1: rc[1], star2: rc[2], star3: rc[3], star4: rc[4], star5: rc[5] };
  }
  const total = Number(rv.total_rating_count ?? deep(data, "cmt_count"));
  if (Number.isFinite(total) && total > 0) out.reviewCount = total;
  const sold = Number(rv.historical_sold ?? rv.global_sold ?? item.historical_sold ?? item.sold ?? deep(data, "historical_sold"));
  if (Number.isFinite(sold) && sold > 0) out.sold = sold;
  const like = Number(rv.liked_count ?? item.liked_count ?? deep(data, "liked_count"));
  if (Number.isFinite(like) && like >= 0) out.likeCount = like;
  const stock = Number(item.stock ?? item.normal_stock ?? deep(data, "stock"));
  if (Number.isFinite(stock) && stock >= 0) out.stock = stock;

  const tiers = (item.tier_variations ?? deep(data, "tier_variations")) as unknown;
  if (Array.isArray(tiers)) {
    out.variants = tiers.filter(isObj).slice(0, 5).map((t) => {
      const opts = Array.isArray(t.options) ? t.options : [];
      const ims = Array.isArray(t.images) ? t.images : [];
      return { name: s(t.name) || "Phân loại", options: opts.slice(0, 80).map((o, i) => ({ name: s(o).slice(0, 80), image: ims[i] ? img(ims[i]) : null })).filter((o) => o.name) };
    }).filter((g) => g.options.length);
  }
  const attrs = ((deep(data, "product_attributes") as Obj | undefined)?.attrs ?? item.attributes ?? deep(data, "attrs")) as unknown;
  if (Array.isArray(attrs)) {
    out.attributes = attrs.filter(isObj).map((a) => ({ label: s(a.name ?? a.label).slice(0, 80), value: s(a.value ?? (Array.isArray(a.values) ? a.values.join(", ") : "")).slice(0, 500) })).filter((a) => a.label && a.value).slice(0, 60);
  }
  const brand = s(item.brand ?? deep(data, "brand"));
  if (brand && brand !== "0" && !out.attributes.some((a) => /thương hiệu|brand/i.test(a.label))) out.attributes.unshift({ label: "Thương hiệu", value: brand });
  out.brand = brand;
  const cats = ((deep(data, "product_attributes") as Obj | undefined)?.categories ?? item.categories ?? item.fe_categories ?? deep(data, "categories")) as unknown;
  if (Array.isArray(cats)) {
    out.sourcePath = cats.filter(isObj).map((c) => ({ name: s(c.display_name ?? c.name).slice(0, 120), url: c.catid ? `https://shopee.vn/-cat.${c.catid}` : null })).filter((c) => c.name).slice(0, 10);
  }
  const shop = (data.shop_detailed ?? deep(data, "shop_detailed")) as Obj | undefined;
  if (isObj(shop)) {
    const acc = isObj(shop.account) ? shop.account : {};
    const joined = Number(shop.ctime);
    out.shop = {
      name: s(shop.name).slice(0, 120) || undefined, url: shop.shopid ? `https://shopee.vn/shop/${shop.shopid}` : null,
      avatar: acc.portrait ? img(acc.portrait) : null,
      ratingCount: shop.rating_star ? `${Number(shop.rating_star).toFixed(1)}★` : undefined,
      responseRate: shop.response_rate != null ? `${shop.response_rate}%` : undefined,
      productCount: shop.item_count != null ? String(shop.item_count) : undefined,
      followers: shop.follower_count != null ? String(shop.follower_count) : undefined,
      joined: Number.isFinite(joined) && joined > 0 ? new Date(joined * 1000).toLocaleDateString("vi-VN") : undefined,
    };
    if (!out.shop.name) out.shop = null;
  }
  const vids = (item.video_info_list ?? deep(data, "video_info_list")) as unknown;
  if (Array.isArray(vids) && isObj(vids[0])) {
    const v = vids[0];
    const fmt = isObj(v.default_format) ? v.default_format : Array.isArray(v.formats) && isObj(v.formats[0]) ? v.formats[0] : {};
    const url = s(fmt.url ?? v.url);
    if (url) out.video = { url, poster: v.thumb_url ? img(v.thumb_url) : null };
  }
  out.via.push("api");
}

function fromRatings(r: Obj, out: Scraped) {
  const list = (deep(r, "ratings") ?? deep(r, "items")) as unknown;
  if (!Array.isArray(list)) return;
  for (const x of list.filter(isObj)) {
    if (out.reviews.length >= REVIEWS) break;
    const reply = isObj(x.ItemRatingReply) ? x.ItemRatingReply : isObj(x.reply) ? x.reply : null;
    const items = Array.isArray(x.product_items) ? x.product_items.filter(isObj) : [];
    const media = [
      ...(Array.isArray(x.images) ? x.images : []).map((h) => ({ type: "image", url: img(h), duration: null })),
      ...(Array.isArray(x.videos) ? x.videos.filter(isObj) : []).map((v) => ({ type: "video", url: s(v.url), duration: v.duration ? String(v.duration) : null })),
    ].filter((m) => m.url);
    const content = s(x.comment ?? x.content);
    if (!content && !media.length) continue;
    out.reviews.push({
      author: s(x.author_username ?? x.author ?? "Ẩn danh") || "Ẩn danh", rating: Number(x.rating_star ?? x.rating) || 5, content,
      variant: s(items[0]?.model_name) || null, reviewedAt: x.ctime ? new Date(Number(x.ctime) * 1000).toISOString() : null,
      media, sellerReply: reply ? s(reply.comment) || null : null, likes: Number(x.like_count) || 0, source: "own",
    });
  }
  out.via.push("ratings");
}

/** du phong khi khong bat duoc API: JSON-LD + the meta */
async function fromDom(page: import("playwright-core").Page, out: Scraped) {
  const d = await page.evaluate(() => {
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((x) => { try { return JSON.parse(x.textContent || ""); } catch { return null; } });
    const meta = (p: string) => document.querySelector(`meta[property="${p}"],meta[name="${p}"]`)?.getAttribute("content") ?? "";
    return { ld, ogImage: meta("og:image"), ogDesc: meta("og:description") || meta("description") };
  });
  const prod = d.ld.flat().find((x) => x && (x["@type"] === "Product" || (Array.isArray(x["@type"]) && x["@type"].includes("Product")))) as Obj | undefined;
  if (prod) {
    const im = prod.image;
    if (!out.images.length) out.images = (Array.isArray(im) ? im : [im]).map(img).filter(Boolean);
    if (!out.description) out.description = s(prod.description);
    const ar = isObj(prod.aggregateRating) ? prod.aggregateRating : null;
    if (ar && out.rating == null) { out.rating = Number(ar.ratingValue) || null; out.reviewCount = Number(ar.ratingCount ?? ar.reviewCount) || out.reviewCount; }
    const of = isObj(prod.offers) ? prod.offers : null;
    if (of && out.price == null) out.price = money(of.lowPrice ?? of.price);
  }
  if (!out.images.length && d.ogImage) out.images = [d.ogImage];
  if (!out.description && d.ogDesc) out.description = d.ogDesc;
  out.via.push("dom");
}

/* ------------------------------ chinh ------------------------------ */
function seedTaxonomy(): Taxonomy {
  let tid = 0;
  return {
    styles: SEED_STYLES.map((x, i) => ({ id: i + 1, slug: x.slug, name: x.name, tagline: x.tagline, intro: x.intro, palette: x.palette, signatureItems: x.signatureItems, keywords: x.keywords, heroImage: null, moodImages: [], sortOrder: i, isActive: true })),
    categories: SEED_CATEGORIES.map((c, i) => ({ id: i + 1, slug: c.slug, name: c.name, aliases: c.aliases, sortOrder: i, isActive: true })),
    types: SEED_CATEGORIES.flatMap((c, ci) => c.types.map((t, i) => ({ id: ++tid, categoryId: ci + 1, slug: t.slug, name: t.name, aliases: t.aliases, sortOrder: i, isActive: true }))),
  };
}

async function launch() {
  let pw: typeof import("playwright-core");
  try { pw = await import("playwright-core"); } catch { throw new Error("Thiếu playwright-core — chạy: pnpm install"); }
  const base = { headless: flag("headless"), viewport: { width: 1280, height: 860 }, locale: "vi-VN", args: ["--disable-blink-features=AutomationControlled"] };
  const chrome = opt("chrome");
  const tries: Parameters<typeof pw.chromium.launchPersistentContext>[1][] = chrome ? [{ ...base, executablePath: chrome }] : [{ ...base, channel: "chrome" }, { ...base, channel: "msedge" }];
  let last: unknown;
  for (const t of tries) {
    try { return await pw.chromium.launchPersistentContext(PROFILE, t); } catch (e) { last = e; }
  }
  throw new Error(`Không mở được Chrome/Edge. Cài Google Chrome hoặc chỉ đường dẫn: --chrome "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"\n${last instanceof Error ? last.message.split("\n")[0] : ""}`);
}

const blocked = (url: string) => /\/buyer\/login|\/verify\/|captcha|\/account\/login/i.test(url);
async function waitHuman(page: import("playwright-core").Page, why: string) {
  log(`⚠ ${why} — hãy xử lý trên cửa sổ Chrome (đăng nhập / giải captcha). Tool tự chạy tiếp, chờ tối đa 5 phút…`);
  const end = Date.now() + 5 * 60_000;
  while (Date.now() < end) { await sleep(2000); if (!blocked(page.url())) return true; }
  return false;
}

async function main() {
  if (flag("login")) {
    const ctx = await launch();
    const page = ctx.pages()[0] ?? (await ctx.newPage());
    await page.goto("https://shopee.vn/buyer/login", { waitUntil: "domcontentloaded" });
    log("Đăng nhập Shopee trên cửa sổ Chrome, xong thì đóng cửa sổ (phiên đăng nhập được lưu trong .shopee-profile).");
    await new Promise<void>((r) => ctx.on("close", () => r()));
    return;
  }
  if (!input) { console.log("Dùng: pnpm scrape:shopee <file.csv|file.xlsx> [--limit 5] [--reviews 20] [--delay 5-10]\nLần đầu nên chạy: pnpm scrape:shopee --login"); process.exit(1); }

  // ---- doc dau vao -> template chuan ----
  const buf = await readFile(input);
  let text = await readUpload(new File([buf], path.basename(input)));
  let rows = parseCsv(text);
  const isTemplate = rows[0]?.some((h) => /chi tiết json|chi tiet json/i.test(h));
  if (!isTemplate) {
    const svc = new ImportService(null as never, async () => seedTaxonomy());
    const r = await svc.template(text);
    r.report.errors.forEach((e) => log(`Bỏ dòng ${e.line}: ${e.message}`));
    text = r.csv; rows = parseCsv(text);
  }
  const head = rows[0]!;
  const col = (name: string) => head.findIndex((h) => canonKey(h) === canonKey(name));
  const C = {
    item: col("itemId"), name: col("name"), price: col("price"), orig: col("originalPrice"), images: col("images"), desc: col("description"),
    url: col("productUrl"), aff: col("affiliateUrl"), rating: col("rating"), rc: col("reviewCount"), sold: col("sold"), stock: col("stock"),
    variants: col("variants"), attrs: col("attributes"), shop: col("shop"), video: col("video"), detail: col("detail"), reviews: col("reviews"), raw: col("raw"),
  };
  const data = rows.slice(1);
  await mkdir(path.join(OUT, "cache"), { recursive: true });

  const ctx = await launch();
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  let ok = 0, fail = 0, cached = 0, streak = 0;
  const todo = data.slice(0, LIMIT);
  for (const [i, row] of todo.entries()) {
    const ids = parseShopeeUrl(row[C.url] ?? "") ?? parseShopeeUrl(row[C.aff] ?? "");
    const itemId = row[C.item] || ids?.itemId;
    const tag = `[${i + 1}/${todo.length}] ${itemId ?? "?"} ${String(row[C.name] ?? "").slice(0, 50)}`;
    if (!ids || !itemId) { log(`${tag} — bỏ qua: không có link shopee.vn/product/...`); fail++; continue; }
    const cacheFile = path.join(OUT, "cache", `${itemId}.json`);
    let got: Scraped | null = null;
    if (!flag("fresh") && (await exists(cacheFile))) { got = JSON.parse(await readFile(cacheFile, "utf8")); cached++; }
    else {
      got = { images: [], description: "", price: null, originalPrice: null, rating: null, reviewCount: null, sold: null, stock: null, likeCount: null, variants: [], attributes: [], sourcePath: [], shop: null, video: null, ratingBreakdown: null, reviews: [], brand: "", via: [] };
      const caught: { pdp?: Obj; ratings: Obj[] } = { ratings: [] };
      const onResp = async (res: import("playwright-core").Response) => {
        const u = res.url();
        if (!/\/api\/v[24]\/(pdp\/get_pc|pdp\/get|item\/get\b|item\/get\?|item\/get_ratings|pdp\/get_rw)/.test(u)) return;
        try {
          const j = await res.json() as Obj;
          if (/get_ratings|get_rw/.test(u)) caught.ratings.push(j);
          else if (!caught.pdp && (deep(j, "item") || deep(j, "product_images"))) caught.pdp = j;
        } catch { /* body khong phai JSON */ }
      };
      page.on("response", onResp);
      try {
        const url = `https://shopee.vn/product/${ids.shopId}/${ids.itemId}`;
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
        if (blocked(page.url())) {
          if (!(await waitHuman(page, "Shopee yêu cầu đăng nhập/xác minh"))) throw new Error("hết thời gian chờ đăng nhập");
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
        }
        for (let t = 0; t < 30 && !caught.pdp; t++) await sleep(500);
        if (REVIEWS > 0) {
          for (let k = 0; k < 6; k++) { await page.mouse.wheel(0, 900); await sleep(700); }
          for (let t = 0; t < 10 && !caught.ratings.length; t++) await sleep(500);
        }
        if (caught.pdp) fromPdp(caught.pdp, got);
        for (const r of caught.ratings) fromRatings(r, got);
        if (!got.images.length || !got.description) await fromDom(page, got);
        if (!got.images.length && !got.description) throw new Error("không lấy được dữ liệu (trang lỗi / bị chặn)");
        await writeFile(cacheFile, JSON.stringify(got));
        ok++; streak = 0;
        log(`${tag} ✓ ${got.images.length} ảnh, ${got.reviews.length} đánh giá, ${got.variants.length} nhóm phân loại [${got.via.join("+")}]`);
      } catch (e) {
        fail++; streak++; got = null;
        log(`${tag} ✗ ${e instanceof Error ? e.message.split("\n")[0] : e}`);
        if (streak >= 5) { log("Lỗi 5 lần liên tiếp — có thể đang bị chặn. Dừng lại; chờ 15-30 phút rồi chạy lại (SP đã cào được giữ trong cache)."); break; }
      } finally { page.off("response", onResp); }
      await sleep((DMIN + Math.random() * Math.max(0, DMAX - DMIN)) * 1000);
    }
    if (got) merge(row, got);
  }
  await ctx.close().catch(() => undefined);

  // ---- ghi ket qua ----
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  const base = path.basename(input).replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "_").slice(0, 40);
  const csvPath = path.join(OUT, `${base}-${stamp}.csv`);
  await writeFile(csvPath, toCsv([head, ...data]));
  const products = data.map((r) => {
    const o: Obj = {};
    head.forEach((h, i) => {
      const k = canonKey(h); const v = r[i] ?? "";
      if (!k || v === "") return;
      o[k] = ["detail", "reviews", "raw", "variants", "attributes"].includes(k) && /^[[{]/.test(v) ? safeJson(v) : v;
    });
    return o;
  });
  const jsonPath = csvPath.replace(/\.csv$/, ".json");
  await writeFile(jsonPath, JSON.stringify({ format: EXPORT_FORMAT, exportedAt: new Date().toISOString(), count: products.length, products }, null, 2));
  log(`Xong: ${ok} cào mới, ${cached} từ cache, ${fail} lỗi.\n  → ${csvPath}\n  → ${jsonPath}\nNhập lại file .csv (hoặc .json) ở /admin/nhap-du-lieu.`);

  function merge(row: string[], g: Scraped) {
    const set = (i: number, v: unknown, overwrite = false) => {
      if (i < 0 || v == null || v === "" || (Array.isArray(v) && !v.length)) return;
      if (!overwrite && (row[i] ?? "").trim()) return;
      row[i] = typeof v === "string" || typeof v === "number" ? String(v) : JSON.stringify(v);
    };
    set(C.images, g.images.slice(0, MAX_IMG).join("|"));
    set(C.desc, g.description.slice(0, 8000));
    set(C.price, g.price);
    if (g.originalPrice && g.price && g.originalPrice > g.price) set(C.orig, g.originalPrice);
    set(C.rating, g.rating, true); set(C.rc, g.reviewCount, true); set(C.sold, g.sold, true); set(C.stock, g.stock, true);
    set(C.variants, g.variants); set(C.attrs, g.attributes); set(C.video, g.video?.url);
    if (g.shop?.name) set(C.shop, g.shop.name);
    const detail = safeJson(row[C.detail] ?? "") as Obj ?? {};
    Object.assign(detail, Object.fromEntries(Object.entries({
      variants: g.variants.length ? g.variants : undefined, attributes: g.attributes.length ? g.attributes : undefined,
      sourcePath: g.sourcePath.length ? g.sourcePath : undefined, shop: g.shop ?? undefined, video: g.video ?? undefined,
      ratingBreakdown: g.ratingBreakdown ?? undefined, likeCount: g.likeCount ?? undefined, stock: g.stock ?? undefined,
    }).filter(([, v]) => v !== undefined)));
    if (C.detail >= 0) row[C.detail] = JSON.stringify(detail);
    if (g.reviews.length) set(C.reviews, g.reviews, true);
    const raw = (safeJson(row[C.raw] ?? "") as Obj) ?? {};
    if (C.raw >= 0) row[C.raw] = JSON.stringify({ ...(raw.affiliate ? raw : { affiliate: raw }), shopee: { brand: g.brand || undefined, scrapedAt: new Date().toISOString(), via: g.via } });
  }
}
function safeJson(v: string): unknown { try { return v ? JSON.parse(v) : null; } catch { return null; } }

main().catch((e) => { console.error("✗", e instanceof Error ? e.message : e); process.exit(1); });
