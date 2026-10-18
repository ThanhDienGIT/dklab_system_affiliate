CREATE TYPE "public"."gender" AS ENUM('female', 'male', 'other');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('customer', 'editor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_types" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "product_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"category_id" integer NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "user_styles" (
	"user_id" uuid NOT NULL,
	"style_id" integer NOT NULL,
	CONSTRAINT "user_styles_user_id_style_id_pk" PRIMARY KEY("user_id","style_id")
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" uuid NOT NULL,
	"product_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "newsletter_subscribers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" text NOT NULL,
	"source" text DEFAULT 'footer' NOT NULL,
	"consent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "search_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "search_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"query" text NOT NULL,
	"plan" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"planner" text DEFAULT 'rules' NOT NULL,
	"result_count" integer DEFAULT 0 NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_types" ADD CONSTRAINT "product_types_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_styles" ADD CONSTRAINT "user_styles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_styles" ADD CONSTRAINT "user_styles_style_id_styles_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."styles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_style_id_styles_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."styles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_type_id_product_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."product_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_logs" ADD CONSTRAINT "search_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_types_cat_slug_uq" ON "product_types" USING btree ("category_id","slug");--> statement-breakpoint
CREATE INDEX "product_types_slug_idx" ON "product_types" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "refresh_user_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_family_idx" ON "refresh_tokens" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_phone_idx" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "clicks_product_idx" ON "clicks" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "clicks_created_idx" ON "clicks" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_pk" ON "favorites" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "products_taxo_idx" ON "products" USING btree ("status","style_id","category_id");--> statement-breakpoint
CREATE INDEX "products_type_idx" ON "products" USING btree ("type_id");--> statement-breakpoint
CREATE INDEX "products_price_idx" ON "products" USING btree ("price");--> statement-breakpoint
CREATE INDEX "products_published_idx" ON "products" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "products_sold_idx" ON "products" USING btree ("sold");--> statement-breakpoint
CREATE INDEX "products_colors_gin" ON "products" USING gin ("colors");--> statement-breakpoint
CREATE INDEX "products_search_trgm" ON "products" USING gin ("search_text" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "products_merchant_item_uq" ON "products" USING btree ("merchant","item_id") WHERE "products"."item_id" is not null;--> statement-breakpoint
CREATE INDEX "search_logs_created_idx" ON "search_logs" USING btree ("created_at");