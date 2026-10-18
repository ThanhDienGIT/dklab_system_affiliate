import { and, arrayOverlaps, asc, desc, eq, gte, inArray, lte, notInArray, sql, type SQL } from "drizzle-orm";
import type { Db } from "../db/client";
import { categories, clicks, productReviews, productTypes, products, styles } from "../db/schema";
import type { Facets, Paged, ProductCard, ProductDetail, ProductFilter, ProductExtra, ReviewBundle, ReviewDTO, ReviewStats } from "../domain/types";
import type { ReviewInput } from "../domain/validators";
import { discountPct } from "@/lib/format";
import { escapeLike, normalizeVi, tokenize } from "@/lib/text";
import { PAGE_SIZE } from "@/lib/constants";

export interface ProductWrite {
  slug: string; name: string; description: string; styleId: number; categoryId: number; typeId: number | null;
  price: number; originalPrice: number | null; colors: string[]; sizes: string[]; material: string; tags: string[];
  images: string[]; badge: string | null; rating: number; reviewCount: number; sold: number; merchant: string;
  affiliateUrl: string; productUrl: string; itemId: string | null; commissionRate: number | null;
  status: "draft" | "published" | "archived"; isFeatured: boolean; searchText: string; isDemo?: boolean;
  publishedAt?: Date;
  detail?: ProductExtra;
  /** undefined = giu nguyen; null = xoa */
  rawData?: Record<string, unknown> | null;
  /** undefined = giu nguyen; mang = thay the toan bo danh gia */
  reviews?: ReviewInput[];
}

export interface ExportRow {
  id: number; slug: string; name: string; description: string; style: { slug: string; name: string }; category: { slug: string; name: string };
  type: { slug: string; name: string } | null; price: number; originalPrice: number | null; colors: string[]; sizes: string[]; material: string;
  tags: string[]; images: string[]; badge: string | null; rating: number; reviewCount: number; sold: number; merchant: string;
  affiliateUrl: string; productUrl: string; itemId: string | null; commissionRate: number | null; status: "draft" | "published" | "archived";
  isFeatured: boolean; detail: ProductExtra; rawData: Record<string, unknown> | null; reviews: ReviewDTO[];
  publishedAt: string; updatedAt: string;
}

export interface DashboardStats {
  products: { published: number; draft: number; archived: number };
  users: number; clicks7d: number; clicks30d: number;
  clickSeries: { day: string; count: number }[];
  topProducts: { id: number; name: string; slug: string; clicks: number }[];
}

export interface ProductRepository {
  list(f: ProductFilter): Promise<Paged<ProductCard>>;
  facets(f: ProductFilter): Promise<Facets>;
  findBySlug(slug: string, includeAll?: boolean): Promise<ProductDetail | null>;
  findById(id: number): Promise<ProductDetail | null>;
  byIds(ids: number[]): Promise<ProductCard[]>;
  slugExists(slug: string, exceptId?: number): Promise<boolean>;
  create(w: ProductWrite): Promise<number>;
  update(id: number, w: Partial<ProductWrite>): Promise<void>;
  delete(id: number): Promise<void>;
  /** Xoa nhieu san pham (danh gia/click/yeu thich xoa theo FK cascade). Tra ve so dong da xoa. */
  deleteMany(ids: number[]): Promise<number>;
  /** Id san pham khop bo loc admin (tran 20.000) de xoa hang loat */
  idsMatching(f: ProductFilter, limit?: number): Promise<number[]>;
  setStatus(id: number, status: "draft" | "published" | "archived"): Promise<void>;
  findByItemId(merchant: string, itemId: string): Promise<{ id: number } | null>;
  recordClick(c: { productId: number; source: string; referer: string | null; device: string; visitorHash: string | null; userId: string | null }): Promise<void>;
  dashboard(): Promise<DashboardStats>;
  allSlugs(): Promise<{ slug: string; updatedAt: Date }[]>;
  reviewBundle(productId: number, limitEach?: number): Promise<ReviewBundle>;
  rawData(id: number): Promise<Record<string, unknown> | null>;
  reviewsOf(id: number): Promise<ReviewDTO[]>;
  exportRows(f?: { ids?: number[]; status?: "draft" | "published" | "archived"; limit?: number }): Promise<ExportRow[]>;
}

const sel = {
  id: products.id, slug: products.slug, name: products.name, price: products.price, originalPrice: products.originalPrice,
  images: products.images, colors: products.colors, badge: products.badge, rating: products.rating,
  reviewCount: products.reviewCount, sold: products.sold, merchant: products.merchant, publishedAt: products.publishedAt,
  isDemo: products.isDemo, status: products.status,
  styleId: styles.id, styleSlug: styles.slug, styleName: styles.name,
  catId: categories.id, catSlug: categories.slug, catName: categories.name,
  typeId: productTypes.id, typeSlug: productTypes.slug, typeName: productTypes.name,
};
type Row = {
  id: number; slug: string; name: string; price: number; originalPrice: number | null; images: string[]; colors: string[];
  badge: string | null; rating: string; reviewCount: number; sold: number; merchant: string; publishedAt: Date; isDemo: boolean; status?: "draft" | "published" | "archived";
  styleId: number; styleSlug: string; styleName: string; catId: number; catSlug: string; catName: string;
  typeId: number | null; typeSlug: string | null; typeName: string | null;
};

const NEW_DAYS = 30;

export function toCard(r: Row): ProductCard {
  return {
    id: r.id, slug: r.slug, name: r.name, price: r.price, originalPrice: r.originalPrice,
    discountPct: discountPct(r.price, r.originalPrice),
    image: r.images[0] ?? null, image2: r.images[1] ?? null,
    style: { id: r.styleId, slug: r.styleSlug, name: r.styleName },
    category: { id: r.catId, slug: r.catSlug, name: r.catName },
    type: r.typeId && r.typeSlug && r.typeName ? { id: r.typeId, slug: r.typeSlug, name: r.typeName } : null,
    colors: r.colors, badge: r.badge, rating: Number(r.rating), reviewCount: r.reviewCount, sold: r.sold,
    isNew: Date.now() - r.publishedAt.getTime() < NEW_DAYS * 864e5, merchant: r.merchant, isDemo: r.isDemo, status: r.status,
  };
}

function baseQuery(db: Db) {
  return db.select(sel).from(products)
    .innerJoin(styles, eq(styles.id, products.styleId))
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(productTypes, eq(productTypes.id, products.typeId));
}

export function buildWhere(f: ProductFilter, skip: { price?: boolean; colors?: boolean; type?: boolean } = {}): SQL | undefined {
  const c: (SQL | undefined)[] = [];
  if (!f.includeAll) { c.push(eq(products.status, "published"), eq(styles.isActive, true)); }
  else if (f.status) c.push(eq(products.status, f.status));
  if (f.styleSlug) c.push(eq(styles.slug, f.styleSlug));
  if (f.styleId) c.push(eq(products.styleId, f.styleId));
  if (f.styleIds?.length) c.push(inArray(products.styleId, f.styleIds));
  if (f.categorySlug) c.push(eq(categories.slug, f.categorySlug));
  if (f.categoryId) c.push(eq(products.categoryId, f.categoryId));
  if (!skip.type && f.typeSlug) c.push(eq(productTypes.slug, f.typeSlug));
  if (!skip.type && f.typeId) c.push(eq(products.typeId, f.typeId));
  if (!skip.colors && f.colors?.length) c.push(arrayOverlaps(products.colors, f.colors));
  if (!skip.price && f.priceMin !== undefined) c.push(gte(products.price, f.priceMin));
  if (!skip.price && f.priceMax !== undefined) c.push(lte(products.price, f.priceMax));
  for (const t of f.keywords ?? []) c.push(sql`${products.searchText} ILIKE ${"%" + escapeLike(t) + "%"}`);
  if (f.onSale) c.push(sql`${products.originalPrice} > ${products.price}`);
  if (f.isNew) c.push(gte(products.publishedAt, new Date(Date.now() - NEW_DAYS * 864e5)));
  if (f.featured) c.push(eq(products.isFeatured, true));
  if (f.ids?.length) c.push(inArray(products.id, f.ids));
  if (f.excludeIds?.length) c.push(notInArray(products.id, f.excludeIds));
  const parts = c.filter((x): x is SQL => Boolean(x));
  return parts.length ? and(...parts) : undefined;
}

function orderBy(f: ProductFilter): SQL[] {
  switch (f.sort) {
    case "newest": return [desc(products.publishedAt), desc(products.id)];
    case "bestseller": return [desc(products.sold), desc(products.id)];
    case "price_asc": return [asc(products.price), desc(products.id)];
    case "price_desc": return [desc(products.price), desc(products.id)];
    case "discount":
      return [sql`coalesce((${products.originalPrice} - ${products.price})::float / nullif(${products.originalPrice}, 0), 0) desc`, desc(products.sold)];
    case "relevance": {
      const q = normalizeVi(f.rawQuery ?? (f.keywords ?? []).join(" "));
      return q
        ? [sql`similarity(${products.searchText}, ${q}) desc`, desc(products.sold), desc(products.id)]
        : [desc(products.isFeatured), desc(products.sold), desc(products.id)];
    }
    default: return [desc(products.isFeatured), desc(products.sold), desc(products.publishedAt), desc(products.id)];
  }
}

export class DrizzleProductRepository implements ProductRepository {
  constructor(private db: Db) {}

  async list(f: ProductFilter): Promise<Paged<ProductCard>> {
    const pageSize = Math.min(Math.max(f.pageSize ?? PAGE_SIZE, 1), 100);
    const page = Math.max(f.page ?? 1, 1);
    const where = buildWhere(f);
    const [rows, totalRows] = await Promise.all([
      baseQuery(this.db).where(where).orderBy(...orderBy(f)).limit(pageSize).offset((page - 1) * pageSize),
      this.db.select({ n: sql<number>`count(*)::int` }).from(products)
        .innerJoin(styles, eq(styles.id, products.styleId))
        .innerJoin(categories, eq(categories.id, products.categoryId))
        .leftJoin(productTypes, eq(productTypes.id, products.typeId))
        .where(where),
    ]);
    const total = totalRows[0]?.n ?? 0;
    return { items: rows.map((r) => toCard(r as Row)), total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async facets(f: ProductFilter): Promise<Facets> {
    const join = <T extends { from: (t: typeof products) => { innerJoin: Function } }>(q: T) => q;
    void join;
    const scope = (skip: Parameters<typeof buildWhere>[1]) => buildWhere({ ...f, page: undefined }, skip);
    const from = <S extends Record<string, unknown>>(shape: S) =>
      this.db.select(shape as never).from(products)
        .innerJoin(styles, eq(styles.id, products.styleId))
        .innerJoin(categories, eq(categories.id, products.categoryId))
        .leftJoin(productTypes, eq(productTypes.id, products.typeId));

    const [price, colorRows, typeRows] = await Promise.all([
      from({ min: sql<number>`coalesce(min(${products.price}), 0)::int`, max: sql<number>`coalesce(max(${products.price}), 0)::int` })
        .where(scope({ price: true })) as unknown as Promise<{ min: number; max: number }[]>,
      from({ slug: sql<string>`c`, n: sql<number>`count(*)::int` })
        .crossJoin(sql`unnest(${products.colors}) as c`).where(scope({ colors: true })).groupBy(sql`c`) as unknown as Promise<{ slug: string; n: number }[]>,
      from({ slug: productTypes.slug, name: productTypes.name, n: sql<number>`count(*)::int` })
        .where(scope({ type: true })).groupBy(productTypes.slug, productTypes.name, productTypes.sortOrder)
        .orderBy(asc(productTypes.sortOrder)) as unknown as Promise<{ slug: string | null; name: string | null; n: number }[]>,
    ]);
    return {
      priceMin: price[0]?.min ?? 0,
      priceMax: price[0]?.max ?? 0,
      colors: colorRows.map((r) => ({ slug: r.slug, count: r.n })).sort((a, b) => b.count - a.count),
      types: typeRows.filter((r) => r.slug && r.name).map((r) => ({ slug: r.slug!, name: r.name!, count: r.n })),
    };
  }

  private async detail(where: SQL | undefined): Promise<ProductDetail | null> {
    const rows = await this.db.select({
      ...sel, description: products.description, sizes: products.sizes, material: products.material, tags: products.tags,
      affiliateUrl: products.affiliateUrl, productUrl: products.productUrl, itemId: products.itemId,
      commissionRate: products.commissionRate, status: products.status, isFeatured: products.isFeatured, clicks: products.clicks,
      detail: products.detail,
    }).from(products)
      .innerJoin(styles, eq(styles.id, products.styleId))
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .leftJoin(productTypes, eq(productTypes.id, products.typeId))
      .where(where).limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      ...toCard(r as Row), description: r.description, sizes: r.sizes, material: r.material, tags: r.tags, images: r.images,
      affiliateUrl: r.affiliateUrl, productUrl: r.productUrl, itemId: r.itemId,
      commissionRate: r.commissionRate === null ? null : Number(r.commissionRate),
      status: r.status, isFeatured: r.isFeatured, publishedAt: r.publishedAt.toISOString(), clicks: r.clicks,
      detail: (r.detail ?? {}) as ProductExtra,
    };
  }

  findBySlug(slug: string, includeAll = false) {
    return this.detail(includeAll ? eq(products.slug, slug) : and(eq(products.slug, slug), eq(products.status, "published")));
  }
  findById(id: number) { return this.detail(eq(products.id, id)); }

  async byIds(ids: number[]) {
    if (!ids.length) return [];
    const rows = await baseQuery(this.db).where(and(inArray(products.id, ids), eq(products.status, "published")));
    const order = new Map(ids.map((id, i) => [id, i]));
    return rows.map((r) => toCard(r as Row)).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }

  async slugExists(slug: string, exceptId?: number) {
    const rows = await this.db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(2);
    return rows.some((r) => r.id !== exceptId);
  }

  private toValues(w: Partial<ProductWrite>) {
    const { commissionRate, rating, reviews: _reviews, ...rest } = w;
    void _reviews;
    return {
      ...rest,
      ...(rating !== undefined ? { rating: rating.toFixed(1) } : {}),
      ...(commissionRate !== undefined ? { commissionRate: commissionRate === null ? null : commissionRate.toFixed(2) } : {}),
    };
  }

  private reviewValues(productId: number, reviews: ReviewInput[]) {
    return reviews.map((r) => ({
      productId, author: r.author, rating: r.rating, content: r.content, variant: r.variant,
      reviewedAt: r.reviewedAt ? new Date(r.reviewedAt) : null, media: r.media.map((m) => ({ type: m.type, url: m.url!, duration: m.duration ?? null })),
      sellerReply: r.sellerReply, likes: r.likes, source: r.source,
    }));
  }

  async create(w: ProductWrite) {
    return this.db.transaction(async (tx) => {
      const [r] = await tx.insert(products).values(this.toValues(w) as typeof products.$inferInsert).returning({ id: products.id });
      if (w.reviews?.length) await tx.insert(productReviews).values(this.reviewValues(r!.id, w.reviews));
      return r!.id;
    });
  }
  async update(id: number, w: Partial<ProductWrite>) {
    await this.db.transaction(async (tx) => {
      await tx.update(products).set({ ...this.toValues(w), updatedAt: new Date() }).where(eq(products.id, id));
      if (w.reviews !== undefined) {
        await tx.delete(productReviews).where(eq(productReviews.productId, id));
        if (w.reviews.length) await tx.insert(productReviews).values(this.reviewValues(id, w.reviews));
      }
    });
  }
  async delete(id: number) { await this.db.delete(products).where(eq(products.id, id)); }
  async deleteMany(ids: number[]) {
    const uniq = [...new Set(ids.filter((n) => Number.isInteger(n) && n > 0))];
    let n = 0;
    // chia lo 1000 id/cau lenh: tranh cau SQL qua dai va giu transaction ngan
    for (let i = 0; i < uniq.length; i += 1000) {
      const r = await this.db.delete(products).where(inArray(products.id, uniq.slice(i, i + 1000))).returning({ id: products.id });
      n += r.length;
    }
    return n;
  }
  async idsMatching(f: ProductFilter, limit = 20000) {
    const rows = await baseQuery(this.db).where(buildWhere({ ...f, includeAll: true })).orderBy(asc(products.id)).limit(limit);
    return rows.map((r) => r.id);
  }
  async setStatus(id: number, status: "draft" | "published" | "archived") {
    await this.db.update(products).set({ status, updatedAt: new Date() }).where(eq(products.id, id));
  }
  async findByItemId(merchant: string, itemId: string) {
    const r = await this.db.select({ id: products.id }).from(products)
      .where(and(eq(products.merchant, merchant), eq(products.itemId, itemId))).limit(1);
    return r[0] ?? null;
  }

  async recordClick(c: { productId: number; source: string; referer: string | null; device: string; visitorHash: string | null; userId: string | null }) {
    await this.db.transaction(async (tx) => {
      await tx.insert(clicks).values(c);
      await tx.update(products).set({ clicks: sql`${products.clicks} + 1` }).where(eq(products.id, c.productId));
    });
  }

  async dashboard(): Promise<DashboardStats> {
    const [pc, uc, series, top] = await Promise.all([
      this.db.select({ status: products.status, n: sql<number>`count(*)::int` }).from(products).groupBy(products.status),
      this.db.execute(sql`select count(*)::int as n from users`) as unknown as Promise<{ n: number }[]>,
      this.db.execute(sql`
        select to_char(d::date, 'YYYY-MM-DD') as day, coalesce(c.n, 0)::int as count
        from generate_series(current_date - interval '29 days', current_date, interval '1 day') d
        left join (select created_at::date as day, count(*) as n from clicks
                   where created_at >= current_date - interval '29 days' group by 1) c on c.day = d::date
        order by d`) as unknown as Promise<{ day: string; count: number }[]>,
      this.db.execute(sql`
        select p.id, p.name, p.slug, count(k.id)::int as clicks
        from clicks k join products p on p.id = k.product_id
        where k.created_at >= now() - interval '30 days'
        group by p.id order by clicks desc limit 8`) as unknown as Promise<{ id: number; name: string; slug: string; clicks: number }[]>,
    ]);
    const by = (s: string) => pc.find((r) => r.status === s)?.n ?? 0;
    const s = Array.from(series);
    return {
      products: { published: by("published"), draft: by("draft"), archived: by("archived") },
      users: Array.from(uc)[0]?.n ?? 0,
      clicks7d: s.slice(-7).reduce((a, b) => a + b.count, 0),
      clicks30d: s.reduce((a, b) => a + b.count, 0),
      clickSeries: s, topProducts: Array.from(top),
    };
  }

  private toReview(r: typeof productReviews.$inferSelect): ReviewDTO {
    return {
      id: r.id, author: r.author, rating: r.rating, content: r.content, variant: r.variant,
      reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null, media: r.media ?? [], sellerReply: r.sellerReply,
      likes: r.likes, source: r.source === "similar" ? "similar" : "own",
    };
  }

  async reviewsOf(id: number) {
    const rows = await this.db.select().from(productReviews).where(eq(productReviews.productId, id))
      .orderBy(asc(productReviews.source), desc(productReviews.reviewedAt), desc(productReviews.id));
    return rows.map((r) => this.toReview(r));
  }

  async reviewBundle(productId: number, limitEach = 100): Promise<ReviewBundle> {
    const [rows, agg] = await Promise.all([
      this.db.select().from(productReviews).where(eq(productReviews.productId, productId))
        .orderBy(desc(productReviews.reviewedAt), desc(productReviews.id)).limit(limitEach * 2),
      this.db.select({
        star: productReviews.rating, n: sql<number>`count(*)::int`,
        withComment: sql<number>`count(*) filter (where length(btrim(${productReviews.content})) > 0)::int`,
        withMedia: sql<number>`count(*) filter (where jsonb_array_length(${productReviews.media}) > 0)::int`,
      }).from(productReviews).where(and(eq(productReviews.productId, productId), eq(productReviews.source, "own"))).groupBy(productReviews.rating),
    ]);
    const star = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as ReviewStats["star"];
    let total = 0, sum = 0, withComment = 0, withMedia = 0;
    for (const a of agg) {
      if (a.star >= 1 && a.star <= 5) star[a.star as 1 | 2 | 3 | 4 | 5] = a.n;
      total += a.n; sum += a.n * a.star; withComment += a.withComment; withMedia += a.withMedia;
    }
    const all = rows.map((r) => this.toReview(r));
    return {
      stats: { total, star, withComment, withMedia, average: total ? sum / total : 0 },
      own: all.filter((r) => r.source === "own").slice(0, limitEach),
      similar: all.filter((r) => r.source === "similar").slice(0, limitEach),
    };
  }

  async rawData(id: number) {
    const r = await this.db.select({ raw: products.rawData }).from(products).where(eq(products.id, id)).limit(1);
    return (r[0]?.raw ?? null) as Record<string, unknown> | null;
  }

  async exportRows(f: { ids?: number[]; status?: "draft" | "published" | "archived"; limit?: number } = {}): Promise<ExportRow[]> {
    const where = and(f.ids?.length ? inArray(products.id, f.ids) : undefined, f.status ? eq(products.status, f.status) : undefined);
    const rows = await this.db.select({
      p: products,
      styleSlug: styles.slug, styleName: styles.name, catSlug: categories.slug, catName: categories.name,
      typeSlug: productTypes.slug, typeName: productTypes.name,
    }).from(products)
      .innerJoin(styles, eq(styles.id, products.styleId))
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .leftJoin(productTypes, eq(productTypes.id, products.typeId))
      .where(where).orderBy(asc(products.id)).limit(Math.min(f.limit ?? 5000, 5000));
    if (!rows.length) return [];
    const ids = rows.map((r) => r.p.id);
    const revs = await this.db.select().from(productReviews).where(inArray(productReviews.productId, ids))
      .orderBy(desc(productReviews.reviewedAt), desc(productReviews.id));
    const byProduct = new Map<number, ReviewDTO[]>();
    for (const r of revs) (byProduct.get(r.productId) ?? byProduct.set(r.productId, []).get(r.productId)!).push(this.toReview(r));
    return rows.map(({ p, ...x }) => ({
      id: p.id, slug: p.slug, name: p.name, description: p.description,
      style: { slug: x.styleSlug, name: x.styleName }, category: { slug: x.catSlug, name: x.catName },
      type: x.typeSlug && x.typeName ? { slug: x.typeSlug, name: x.typeName } : null,
      price: p.price, originalPrice: p.originalPrice, colors: p.colors, sizes: p.sizes, material: p.material, tags: p.tags, images: p.images,
      badge: p.badge, rating: Number(p.rating), reviewCount: p.reviewCount, sold: p.sold, merchant: p.merchant,
      affiliateUrl: p.affiliateUrl, productUrl: p.productUrl, itemId: p.itemId,
      commissionRate: p.commissionRate === null ? null : Number(p.commissionRate), status: p.status, isFeatured: p.isFeatured,
      detail: (p.detail ?? {}) as ProductExtra, rawData: (p.rawData ?? null) as Record<string, unknown> | null,
      reviews: byProduct.get(p.id) ?? [], publishedAt: p.publishedAt.toISOString(), updatedAt: p.updatedAt.toISOString(),
    }));
  }

  async allSlugs() {
    return this.db.select({ slug: products.slug, updatedAt: products.updatedAt }).from(products).where(eq(products.status, "published"));
  }
}

export { tokenize };
