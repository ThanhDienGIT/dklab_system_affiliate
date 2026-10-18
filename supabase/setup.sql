-- Dan ca file vao Supabase -> SQL Editor -> Run. Tao bang + RLS (khong co du lieu mau).
-- CHI chay 1 lan, va khong chay cung `pnpm db:migrate` (se trung bang).

-- ===== 0000_extensions.sql =====
-- Quy uoc DK Lab: bat 2 extension tren MOI database (tim kiem tieng Viet khong dau)
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ===== 0001_init.sql =====
CREATE TYPE "public"."gender" AS ENUM('female', 'male', 'other');
CREATE TYPE "public"."user_role" AS ENUM('customer', 'editor', 'admin');
CREATE TYPE "public"."user_status" AS ENUM('active', 'blocked');
CREATE TYPE "public"."product_status" AS ENUM('draft', 'published', 'archived');
CREATE TABLE "categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);

CREATE TABLE "product_types" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "product_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"category_id" integer NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);

CREATE TABLE "styles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "styles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"intro" text DEFAULT '' NOT NULL,
	"palette" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"signature_items" text[] DEFAULT '{}'::text[] NOT NULL,
	"keywords" text[] DEFAULT '{}'::text[] NOT NULL,
	"hero_image" text,
	"mood_images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "styles_slug_unique" UNIQUE("slug")
);

CREATE TABLE "audit_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"replaced_by" uuid,
	"user_agent" text,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);

CREATE TABLE "user_styles" (
	"user_id" uuid NOT NULL,
	"style_id" integer NOT NULL,
	CONSTRAINT "user_styles_user_id_style_id_pk" PRIMARY KEY("user_id","style_id")
);

CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"password_hash" text,
	"google_sub" text,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"full_name" text DEFAULT '' NOT NULL,
	"phone" text,
	"birth_date" date,
	"gender" "gender",
	"province" text,
	"address_line" text,
	"size" text,
	"height_cm" integer,
	"budget_max" integer,
	"avatar_url" text,
	"cccd_enc" text,
	"cccd_last4" text,
	"newsletter" boolean DEFAULT false NOT NULL,
	"consent_at" timestamp with time zone,
	"failed_logins" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"token_version" integer DEFAULT 0 NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_sub_unique" UNIQUE("google_sub")
);

CREATE TABLE "clicks" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "clicks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"product_id" integer NOT NULL,
	"source" text DEFAULT 'card' NOT NULL,
	"referer" text,
	"device" text DEFAULT 'desktop' NOT NULL,
	"visitor_hash" text,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "favorites" (
	"user_id" uuid NOT NULL,
	"product_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "products" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "products_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"style_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"type_id" integer,
	"price" integer NOT NULL,
	"original_price" integer,
	"colors" text[] DEFAULT '{}'::text[] NOT NULL,
	"sizes" text[] DEFAULT '{}'::text[] NOT NULL,
	"material" text DEFAULT '' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"badge" text,
	"rating" numeric(2, 1) DEFAULT '0' NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"sold" integer DEFAULT 0 NOT NULL,
	"merchant" text DEFAULT 'shopee' NOT NULL,
	"affiliate_url" text DEFAULT '' NOT NULL,
	"product_url" text DEFAULT '' NOT NULL,
	"item_id" text,
	"commission_rate" numeric(4, 2),
	"status" "product_status" DEFAULT 'published' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"search_text" text DEFAULT '' NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);

CREATE TABLE "newsletter_subscribers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "newsletter_subscribers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" text NOT NULL,
	"source" text DEFAULT 'footer' NOT NULL,
	"consent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);

CREATE TABLE "search_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "search_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"query" text NOT NULL,
	"plan" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"planner" text DEFAULT 'rules' NOT NULL,
	"result_count" integer DEFAULT 0 NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "product_types" ADD CONSTRAINT "product_types_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_styles" ADD CONSTRAINT "user_styles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_styles" ADD CONSTRAINT "user_styles_style_id_styles_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."styles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "products" ADD CONSTRAINT "products_style_id_styles_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."styles"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "products" ADD CONSTRAINT "products_type_id_product_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."product_types"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "search_logs" ADD CONSTRAINT "search_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
CREATE UNIQUE INDEX "product_types_cat_slug_uq" ON "product_types" USING btree ("category_id","slug");
CREATE INDEX "product_types_slug_idx" ON "product_types" USING btree ("slug");
CREATE INDEX "audit_created_idx" ON "audit_log" USING btree ("created_at");
CREATE INDEX "audit_actor_idx" ON "audit_log" USING btree ("actor_id");
CREATE INDEX "refresh_user_idx" ON "refresh_tokens" USING btree ("user_id");
CREATE INDEX "refresh_family_idx" ON "refresh_tokens" USING btree ("family_id");
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");
CREATE INDEX "users_phone_idx" ON "users" USING btree ("phone");
CREATE INDEX "clicks_product_idx" ON "clicks" USING btree ("product_id");
CREATE INDEX "clicks_created_idx" ON "clicks" USING btree ("created_at");
CREATE UNIQUE INDEX "favorites_pk" ON "favorites" USING btree ("user_id","product_id");
CREATE INDEX "products_taxo_idx" ON "products" USING btree ("status","style_id","category_id");
CREATE INDEX "products_type_idx" ON "products" USING btree ("type_id");
CREATE INDEX "products_price_idx" ON "products" USING btree ("price");
CREATE INDEX "products_published_idx" ON "products" USING btree ("published_at");
CREATE INDEX "products_sold_idx" ON "products" USING btree ("sold");
CREATE INDEX "products_colors_gin" ON "products" USING gin ("colors");
CREATE INDEX "products_search_trgm" ON "products" USING gin ("search_text" gin_trgm_ops);
CREATE UNIQUE INDEX "products_merchant_item_uq" ON "products" USING btree ("merchant","item_id") WHERE "products"."item_id" is not null;
CREATE INDEX "search_logs_created_idx" ON "search_logs" USING btree ("created_at");

-- ===== 0002_supabase_rls.sql =====
-- Supabase: bang trong schema public duoc PostgREST/supabase-js lo ra qua khoa "anon" (publishable key - khoa nay nam o trinh duyet).
-- => BAT RLS cho MOI bang: khong co policy thi anon/authenticated khong doc/ghi duoc gi (users, refresh_tokens, audit_log... an toan).
-- App Next.js ket noi bang role `postgres` (chu bang) nen KHONG bi RLS chan.
-- Chay duoc ca tren Postgres thuong (Docker/local): khong co role anon thi chi bat RLS.
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

    -- Chi cho doc cong khai du lieu danh muc (khong co du lieu ca nhan)
    GRANT SELECT ON public.styles, public.categories, public.product_types, public.products TO anon, authenticated;

    DROP POLICY IF EXISTS "public read styles" ON public.styles;
    CREATE POLICY "public read styles" ON public.styles FOR SELECT TO anon, authenticated USING (is_active);
    DROP POLICY IF EXISTS "public read categories" ON public.categories;
    CREATE POLICY "public read categories" ON public.categories FOR SELECT TO anon, authenticated USING (is_active);
    DROP POLICY IF EXISTS "public read product_types" ON public.product_types;
    CREATE POLICY "public read product_types" ON public.product_types FOR SELECT TO anon, authenticated USING (is_active);
    DROP POLICY IF EXISTS "public read products" ON public.products;
    CREATE POLICY "public read products" ON public.products FOR SELECT TO anon, authenticated USING (status = 'published');
  END IF;
END
$$;

-- ===== 0003_product_detail_reviews.sql =====
CREATE TABLE "product_reviews" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "product_reviews_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"product_id" integer NOT NULL,
	"author" text DEFAULT '' NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"variant" text,
	"reviewed_at" timestamp with time zone,
	"media" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seller_reply" text,
	"likes" integer DEFAULT 0 NOT NULL,
	"source" text DEFAULT 'own' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "products" ADD COLUMN "detail" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "products" ADD COLUMN "raw_data" jsonb;
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "product_reviews_product_idx" ON "product_reviews" USING btree ("product_id","source");
-- Supabase: bang moi phai bat RLS (khong policy = anon/authenticated khong doc/ghi duoc)
ALTER TABLE "product_reviews" ENABLE ROW LEVEL SECURITY;


-- ===== 0004_analytics_indexes.sql =====
-- Index cho trang public (partial status=published), bang thong ke luot xem + lich su xem cua tai khoan
CREATE TABLE "product_views_daily" (
	"product_id" integer NOT NULL,
	"day" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"from_search" integer DEFAULT 0 NOT NULL,
	"mobile" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_views_daily_product_id_day_pk" PRIMARY KEY("product_id","day")
);

CREATE TABLE "user_product_views" (
	"user_id" uuid NOT NULL,
	"product_id" integer NOT NULL,
	"views" integer DEFAULT 1 NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_product_views_user_id_product_id_pk" PRIMARY KEY("user_id","product_id")
);

DROP INDEX IF EXISTS "clicks_product_idx";
DROP INDEX IF EXISTS "products_type_idx";
DROP INDEX IF EXISTS "products_price_idx";
DROP INDEX IF EXISTS "products_published_idx";
DROP INDEX IF EXISTS "products_sold_idx";
DROP INDEX IF EXISTS "product_reviews_product_idx";
ALTER TABLE "product_views_daily" ADD CONSTRAINT "product_views_daily_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_product_views" ADD CONSTRAINT "user_product_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_product_views" ADD CONSTRAINT "user_product_views_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX IF NOT EXISTS "product_views_day_idx" ON "product_views_daily" USING btree ("day");
CREATE INDEX IF NOT EXISTS "user_product_views_recent_idx" ON "user_product_views" USING btree ("user_id","viewed_at");
CREATE INDEX IF NOT EXISTS "clicks_product_time_idx" ON "clicks" USING btree ("product_id","created_at");
CREATE INDEX IF NOT EXISTS "favorites_product_idx" ON "favorites" USING btree ("product_id");
CREATE INDEX IF NOT EXISTS "products_cat_type_idx" ON "products" USING btree ("category_id","type_id");
CREATE INDEX IF NOT EXISTS "products_type_style_idx" ON "products" USING btree ("type_id","style_id");
CREATE INDEX IF NOT EXISTS "products_pub_popular_idx" ON "products" USING btree ("is_featured","sold","published_at","id") WHERE "products"."status" = 'published';
CREATE INDEX IF NOT EXISTS "products_pub_newest_idx" ON "products" USING btree ("published_at","id") WHERE "products"."status" = 'published';
CREATE INDEX IF NOT EXISTS "products_pub_sold_idx" ON "products" USING btree ("sold","id") WHERE "products"."status" = 'published';
CREATE INDEX IF NOT EXISTS "products_pub_price_idx" ON "products" USING btree ("price","id" DESC NULLS FIRST) WHERE "products"."status" = 'published';
CREATE INDEX IF NOT EXISTS "products_pub_sale_idx" ON "products" USING btree ("sold") WHERE "products"."status" = 'published' and "products"."original_price" > "products"."price";
CREATE INDEX IF NOT EXISTS "products_pub_featured_idx" ON "products" USING btree ("id") WHERE "products"."status" = 'published' and "products"."is_featured";
CREATE INDEX IF NOT EXISTS "search_logs_user_idx" ON "search_logs" USING btree ("user_id","created_at") WHERE "search_logs"."user_id" is not null;
CREATE INDEX IF NOT EXISTS "search_logs_empty_idx" ON "search_logs" USING btree ("created_at") WHERE "search_logs"."result_count" = 0;
CREATE INDEX IF NOT EXISTS "product_reviews_product_idx" ON "product_reviews" USING btree ("product_id","reviewed_at","id");
-- Bang thong ke chi doc/ghi qua server (Drizzle, role postgres). Chan truy cap truc tiep tu Supabase anon/authenticated.
ALTER TABLE "product_views_daily" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_product_views" ENABLE ROW LEVEL SECURITY;

-- 0005_ai_config
CREATE TABLE IF NOT EXISTS "ai_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"api_key_enc" text,
	"default_model" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "ai_settings_singleton" CHECK ("id" = 1)
);

CREATE TABLE IF NOT EXISTS "ai_feature_models" (
	"feature" text PRIMARY KEY NOT NULL,
	"model" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
-- Chi doc/ghi qua server (Drizzle, role postgres). Chan truy cap truc tiep tu Supabase anon/authenticated (bang chua API key da ma hoa).
ALTER TABLE "ai_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_feature_models" ENABLE ROW LEVEL SECURITY;

-- 0006_blog
CREATE TABLE IF NOT EXISTS "blog_posts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "blog_posts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"cover_url" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"source_mode" text DEFAULT 'db' NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"image_candidates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"primary_product_id" integer,
	"ai_model" text,
	"author_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug"),
	CONSTRAINT "blog_posts_status_chk" CHECK ("status" IN ('draft','published'))
);

CREATE TABLE IF NOT EXISTS "blog_post_products" (
	"post_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	CONSTRAINT "blog_post_products_post_id_product_id_pk" PRIMARY KEY("post_id","product_id")
);

ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_primary_product_id_products_id_fk" FOREIGN KEY ("primary_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "blog_post_products" ADD CONSTRAINT "blog_post_products_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "blog_post_products" ADD CONSTRAINT "blog_post_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX IF NOT EXISTS "blog_posts_pub_idx" ON "blog_posts" USING btree ("published_at","id") WHERE "blog_posts"."status" = 'published';
CREATE INDEX IF NOT EXISTS "blog_posts_created_idx" ON "blog_posts" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "blog_posts_primary_idx" ON "blog_posts" USING btree ("primary_product_id");
CREATE INDEX IF NOT EXISTS "blog_post_products_product_idx" ON "blog_post_products" USING btree ("product_id");
-- Chi doc/ghi qua server (Drizzle). Blog cong khai doc qua server component, khong mo cho anon/authenticated cua Supabase.
ALTER TABLE "blog_posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "blog_post_products" ENABLE ROW LEVEL SECURITY;
