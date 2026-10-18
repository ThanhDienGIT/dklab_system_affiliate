import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/** Cau hinh AI toan he thong: 1 dong duy nhat (id = 1). API key luu MA HOA AES-256-GCM, khong bao gio tra ve client. */
export const aiSettings = pgTable("ai_settings", {
  id: integer("id").primaryKey().default(1),
  apiKeyEnc: text("api_key_enc"),
  defaultModel: text("default_model"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
});

/** Model rieng cho tung chuc nang (vd search). Khong co dong / enabled = false -> dung model mac dinh. */
export const aiFeatureModels = pgTable("ai_feature_models", {
  feature: text("feature").primaryKey(),
  model: text("model").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
