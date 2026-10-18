import { index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { products } from "./products";
import { users } from "./users";

export interface BlogSource { url: string; title: string; host: string }

/** Bai blog (markdown). status: draft | published. AI tao ra o trang thai draft, admin duyet roi moi xuat ban. */
export const blogPosts = pgTable(
  "blog_posts",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    content: text("content").notNull().default(""),
    coverUrl: text("cover_url"),
    status: text("status").notNull().default("draft"),
    /** db | web | both - nguon du lieu AI da dung */
    sourceMode: text("source_mode").notNull().default("db"),
    sources: jsonb("sources").$type<BlogSource[]>().notNull().default(sql`'[]'::jsonb`),
    /** URL anh tim thay tren cac trang nguon (hotlink, khong tai ve) de admin chon */
    imageCandidates: jsonb("image_candidates").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    primaryProductId: integer("primary_product_id").references(() => products.id, { onDelete: "set null" }),
    aiModel: text("ai_model"),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [
    index("blog_posts_pub_idx").on(t.publishedAt, t.id).where(sql`${t.status} = 'published'`),
    index("blog_posts_created_idx").on(t.createdAt),
    index("blog_posts_primary_idx").on(t.primaryProductId),
  ],
);

/** San pham duoc nhac toi trong bai -> bai tu hien o trang san pham do */
export const blogPostProducts = pgTable(
  "blog_post_products",
  {
    postId: integer("post_id").notNull().references(() => blogPosts.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.productId] }), index("blog_post_products_product_idx").on(t.productId)],
);
