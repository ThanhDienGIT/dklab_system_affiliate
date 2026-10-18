import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").notNull().unique(),
  source: text("source").notNull().default("footer"),
  consentAt: timestamp("consent_at", { withTimezone: true }).notNull().defaultNow(),
});

export const searchLogs = pgTable(
  "search_logs",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    query: text("query").notNull(),
    plan: jsonb("plan").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    planner: text("planner").notNull().default("rules"),
    resultCount: integer("result_count").notNull().default(0),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("search_logs_created_idx").on(t.createdAt),
    index("search_logs_user_idx").on(t.userId, t.createdAt).where(sql`${t.userId} is not null`),
    index("search_logs_empty_idx").on(t.createdAt).where(sql`${t.resultCount} = 0`),
  ],
);
