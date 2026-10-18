import { sql } from "drizzle-orm";
import { boolean, date, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { styles } from "./taxonomy";

export const userRole = pgEnum("user_role", ["customer", "editor", "admin"]);
export const userStatus = pgEnum("user_status", ["active", "blocked"]);
export const gender = pgEnum("gender", ["female", "male", "other"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    passwordHash: text("password_hash"),
    googleSub: text("google_sub").unique(),
    role: userRole("role").notNull().default("customer"),
    status: userStatus("status").notNull().default("active"),
    fullName: text("full_name").notNull().default(""),
    phone: text("phone"),
    birthDate: date("birth_date"),
    gender: gender("gender"),
    province: text("province"),
    addressLine: text("address_line"),
    size: text("size"),
    heightCm: integer("height_cm"),
    budgetMax: integer("budget_max"),
    avatarUrl: text("avatar_url"),
    /** CCCD ma hoa AES-256-GCM; chi giu 4 so cuoi o dang ro de hien thi */
    cccdEnc: text("cccd_enc"),
    cccdLast4: text("cccd_last4"),
    newsletter: boolean("newsletter").notNull().default(false),
    consentAt: timestamp("consent_at", { withTimezone: true }),
    failedLogins: integer("failed_logins").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    /** tang len de huy moi access token cu (doi mat khau, khoa tai khoan...) */
    tokenVersion: integer("token_version").notNull().default(0),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("users_role_idx").on(t.role), index("users_phone_idx").on(t.phone)],
);

export const userStyles = pgTable(
  "user_styles",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    styleId: integer("style_id").notNull().references(() => styles.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.styleId] })],
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    familyId: uuid("family_id").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    replacedBy: uuid("replaced_by"),
    userAgent: text("user_agent"),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("refresh_user_idx").on(t.userId), index("refresh_family_idx").on(t.familyId)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt), index("audit_actor_idx").on(t.actorId)],
);
