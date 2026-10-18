CREATE TABLE "product_views_daily" (
	"product_id" integer NOT NULL,
	"day" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"from_search" integer DEFAULT 0 NOT NULL,
	"mobile" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_views_daily_product_id_day_pk" PRIMARY KEY("product_id","day")
);
--> statement-breakpoint
CREATE TABLE "user_product_views" (
	"user_id" uuid NOT NULL,
	"product_id" integer NOT NULL,
	"views" integer DEFAULT 1 NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_product_views_user_id_product_id_pk" PRIMARY KEY("user_id","product_id")
);
--> statement-breakpoint
DROP INDEX IF EXISTS "clicks_product_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "products_type_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "products_price_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "products_published_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "products_sold_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "product_reviews_product_idx";--> statement-breakpoint
ALTER TABLE "product_views_daily" ADD CONSTRAINT "product_views_daily_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_product_views" ADD CONSTRAINT "user_product_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_product_views" ADD CONSTRAINT "user_product_views_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_views_day_idx" ON "product_views_daily" USING btree ("day");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_product_views_recent_idx" ON "user_product_views" USING btree ("user_id","viewed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clicks_product_time_idx" ON "clicks" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "favorites_product_idx" ON "favorites" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_cat_type_idx" ON "products" USING btree ("category_id","type_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_type_style_idx" ON "products" USING btree ("type_id","style_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_pub_popular_idx" ON "products" USING btree ("is_featured","sold","published_at","id") WHERE "products"."status" = 'published';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_pub_newest_idx" ON "products" USING btree ("published_at","id") WHERE "products"."status" = 'published';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_pub_sold_idx" ON "products" USING btree ("sold","id") WHERE "products"."status" = 'published';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_pub_price_idx" ON "products" USING btree ("price","id" DESC NULLS FIRST) WHERE "products"."status" = 'published';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_pub_sale_idx" ON "products" USING btree ("sold") WHERE "products"."status" = 'published' and "products"."original_price" > "products"."price";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_pub_featured_idx" ON "products" USING btree ("id") WHERE "products"."status" = 'published' and "products"."is_featured";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "search_logs_user_idx" ON "search_logs" USING btree ("user_id","created_at") WHERE "search_logs"."user_id" is not null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "search_logs_empty_idx" ON "search_logs" USING btree ("created_at") WHERE "search_logs"."result_count" = 0;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_reviews_product_idx" ON "product_reviews" USING btree ("product_id","reviewed_at","id");--> statement-breakpoint
-- Bang thong ke chi doc/ghi qua server (Drizzle, role postgres). Chan truy cap truc tiep tu Supabase anon/authenticated.
ALTER TABLE "product_views_daily" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_product_views" ENABLE ROW LEVEL SECURITY;
