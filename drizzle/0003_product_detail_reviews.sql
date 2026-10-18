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
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "detail" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "raw_data" jsonb;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_reviews_product_idx" ON "product_reviews" USING btree ("product_id","source");--> statement-breakpoint
-- Supabase: bang moi phai bat RLS (khong policy = anon/authenticated khong doc/ghi duoc)
ALTER TABLE "product_reviews" ENABLE ROW LEVEL SECURITY;
