import { sql } from "drizzle-orm";
import {
  bigint, boolean, date, index, integer, jsonb, numeric, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";
import type { ProductExtra, ReviewMedia } from "../../domain/product-extra";
import { categories, productTypes, styles } from "./taxonomy";
import { users } from "./users";

export const productStatus = pgEnum("product_status", ["draft", "published", "archived"]);

export const products = pgTable(
  "products",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    styleId: integer("style_id").notNull().references(() => styles.id, { onDelete: "restrict" }),
    categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "restrict" }),
    typeId: integer("type_id").references(() => productTypes.id, { onDelete: "set null" }),
    price: integer("price").notNull(),
    originalPrice: integer("original_price"),
    colors: text("colors").array().notNull().default(sql`'{}'::text[]`),
    sizes: text("sizes").array().notNull().default(sql`'{}'::text[]`),
    material: text("material").notNull().default(""),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    images: jsonb("images").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    badge: text("badge"),
    rating: numeric("rating", { precision: 2, scale: 1 }).notNull().default("0"),
    reviewCount: integer("review_count").notNull().default(0),
    sold: integer("sold").notNull().default(0),
    merchant: text("merchant").notNull().default("shopee"),
    affiliateUrl: text("affiliate_url").notNull().default(""),
    productUrl: text("product_url").notNull().default(""),
    itemId: text("item_id"),
    commissionRate: numeric("commission_rate", { precision: 4, scale: 2 }),
    status: productStatus("status").notNull().default("published"),
    isFeatured: boolean("is_featured").notNull().default(false),
    isDemo: boolean("is_demo").notNull().default(false),
    clicks: integer("clicks").notNull().default(0),
    /** chi tiet kieu Shopee: bien the, thuoc tinh, shop, van chuyen... (xem domain/product-extra.ts) */
    detail: jsonb("detail").$type<ProductExtra>().notNull().default(sql`'{}'::jsonb`),
    /** toan bo JSON goc (cao tu san) de doi chieu / so sanh ve sau */
    rawData: jsonb("raw_data").$type<Record<string, unknown> | null>(),
    /** chuoi da bo dau + thuong hoa de tim kiem (tinh o tang service) */
    searchText: text("search_text").notNull().default(""),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("products_taxo_idx").on(t.status, t.styleId, t.categoryId),
    // ---- Index cho trang public: partial "status = published" -> nho hon, khop dung cau ORDER BY cua tung kieu sap xep
    // khong partial: con phuc vu kiem tra khoa ngoai khi xoa the loai / loai
    index("products_cat_type_idx").on(t.categoryId, t.typeId),
    index("products_type_style_idx").on(t.typeId, t.styleId),
    // Index TANG dan cho ORDER BY ... DESC -> Postgres quet nguoc (backward scan). Khong dung .desc() cua Drizzle:
    // no sinh "DESC NULLS LAST", khong khop "DESC" mac dinh (NULLS FIRST) -> planner bo qua index.
    index("products_pub_popular_idx").on(t.isFeatured, t.sold, t.publishedAt, t.id).where(sql`${t.status} = 'published'`),
    index("products_pub_newest_idx").on(t.publishedAt, t.id).where(sql`${t.status} = 'published'`),
    index("products_pub_sold_idx").on(t.sold, t.id).where(sql`${t.status} = 'published'`),
    index("products_pub_price_idx").on(t.price, t.id.desc().nullsFirst()).where(sql`${t.status} = 'published'`),
    index("products_pub_sale_idx").on(t.sold).where(sql`${t.status} = 'published' and ${t.originalPrice} > ${t.price}`),
    index("products_pub_featured_idx").on(t.id).where(sql`${t.status} = 'published' and ${t.isFeatured}`),
    index("products_colors_gin").using("gin", t.colors),
    index("products_search_trgm").using("gin", t.searchText.op("gin_trgm_ops")),
    uniqueIndex("products_merchant_item_uq").on(t.merchant, t.itemId).where(sql`${t.itemId} is not null`),
  ],
);

export const clicks = pgTable(
  "clicks",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    source: text("source").notNull().default("card"),
    referer: text("referer"),
    device: text("device").notNull().default("desktop"),
    visitorHash: text("visitor_hash"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("clicks_product_time_idx").on(t.productId, t.createdAt), index("clicks_created_idx").on(t.createdAt)],
);

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("favorites_pk").on(t.userId, t.productId), index("favorites_product_idx").on(t.productId)],
);

export const productReviews = pgTable(
  "product_reviews",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    author: text("author").notNull().default(""),
    rating: integer("rating").notNull().default(5),
    content: text("content").notNull().default(""),
    /** phan loai hang khach da mua, vd "Nau,40" */
    variant: text("variant"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    media: jsonb("media").$type<ReviewMedia[]>().notNull().default(sql`'[]'::jsonb`),
    sellerReply: text("seller_reply"),
    likes: integer("likes").notNull().default(0),
    /** own = danh gia cua chinh san pham; similar = "danh gia san pham tuong tu" */
    source: text("source").notNull().default("own"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("product_reviews_product_idx").on(t.productId, t.reviewedAt, t.id)],
);

/** Luot xem trang chi tiet, gop theo ngay (1 dong / san pham / ngay) -> bang nho, thong ke nhanh, khong luu IP */
export const productViewsDaily = pgTable(
  "product_views_daily",
  {
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    views: integer("views").notNull().default(0),
    /** den tu trang tim kiem -> do ty le tim-thay-roi-xem */
    fromSearch: integer("from_search").notNull().default(0),
    mobile: integer("mobile").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.productId, t.day] }), index("product_views_day_idx").on(t.day)],
);

/** "San pham ban da xem" cua tai khoan (dong bo nhieu thiet bi). Khach chua dang nhap luu localStorage. */
export const userProductViews = pgTable(
  "user_product_views",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    views: integer("views").notNull().default(1),
    viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] }), index("user_product_views_recent_idx").on(t.userId, t.viewedAt)],
);
