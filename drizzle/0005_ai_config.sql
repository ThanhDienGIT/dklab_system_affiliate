CREATE TABLE IF NOT EXISTS "ai_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"api_key_enc" text,
	"default_model" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "ai_settings_singleton" CHECK ("id" = 1)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_feature_models" (
	"feature" text PRIMARY KEY NOT NULL,
	"model" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Chi doc/ghi qua server (Drizzle, role postgres). Chan truy cap truc tiep tu Supabase anon/authenticated (bang chua API key da ma hoa).
ALTER TABLE "ai_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_feature_models" ENABLE ROW LEVEL SECURITY;
