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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blog_post_products" (
	"post_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	CONSTRAINT "blog_post_products_post_id_product_id_pk" PRIMARY KEY("post_id","product_id")
);
--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_primary_product_id_products_id_fk" FOREIGN KEY ("primary_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_products" ADD CONSTRAINT "blog_post_products_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_products" ADD CONSTRAINT "blog_post_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_posts_pub_idx" ON "blog_posts" USING btree ("published_at","id") WHERE "blog_posts"."status" = 'published';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_posts_created_idx" ON "blog_posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_posts_primary_idx" ON "blog_posts" USING btree ("primary_product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_post_products_product_idx" ON "blog_post_products" USING btree ("product_id");--> statement-breakpoint
-- Chi doc/ghi qua server (Drizzle). Blog cong khai doc qua server component, khong mo cho anon/authenticated cua Supabase.
ALTER TABLE "blog_posts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "blog_post_products" ENABLE ROW LEVEL SECURITY;
