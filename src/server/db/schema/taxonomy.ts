import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/** Tang 2: phong cach (Y2K, Gloomy Coquette...) = menu cap 1 */
export const styles = pgTable("styles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull().default(""),
  intro: text("intro").notNull().default(""),
  palette: jsonb("palette").$type<{ name: string; hex: string }[]>().notNull().default(sql`'[]'::jsonb`),
  /** mon do dac trung - hien o trang phong cach */
  signatureItems: text("signature_items").array().notNull().default(sql`'{}'::text[]`),
  /** tu khoa/bi danh de bo phan tich tim kiem nhan ra phong cach */
  keywords: text("keywords").array().notNull().default(sql`'{}'::text[]`),
  heroImage: text("hero_image"),
  moodImages: jsonb("mood_images").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** The loai (Quan ao, Chan vay & vay lien...) = menu cap 2, dung chung cho moi phong cach */
export const categories = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  aliases: text("aliases").array().notNull().default(sql`'{}'::text[]`),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

/** Loai cu the (Dam babydoll, Tui kep nach...) thuoc 1 the loai */
export const productTypes = pgTable(
  "product_types",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    aliases: text("aliases").array().notNull().default(sql`'{}'::text[]`),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [uniqueIndex("product_types_cat_slug_uq").on(t.categoryId, t.slug), index("product_types_slug_idx").on(t.slug)],
);
