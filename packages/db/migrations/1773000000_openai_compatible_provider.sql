CREATE TABLE "custom_provider" (
	"id" text PRIMARY KEY,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"base_url" text NOT NULL,
	"description" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"round_robin_index" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "custom_provider_project_id_name_unique" UNIQUE("project_id","name")
);
--> statement-breakpoint
CREATE TABLE "custom_provider_key" (
	"id" text PRIMARY KEY,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"provider_id" text NOT NULL,
	"display_name" text,
	"encrypted_key" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"is_healthy" boolean DEFAULT true NOT NULL,
	"last_failed_at" timestamp,
	"failure_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_provider_model" (
	"id" text PRIMARY KEY,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"provider_id" text NOT NULL,
	"model_id" text NOT NULL,
	"display_name" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"is_manual" boolean DEFAULT false NOT NULL,
	CONSTRAINT "custom_provider_model_provider_id_model_id_unique" UNIQUE("provider_id","model_id")
);
--> statement-breakpoint
CREATE INDEX "custom_provider_project_id_idx" ON "custom_provider" ("project_id");--> statement-breakpoint
CREATE INDEX "custom_provider_key_provider_id_idx" ON "custom_provider_key" ("provider_id");--> statement-breakpoint
CREATE INDEX "custom_provider_model_provider_id_idx" ON "custom_provider_model" ("provider_id");--> statement-breakpoint
ALTER TABLE "custom_provider" ADD CONSTRAINT "custom_provider_project_id_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "custom_provider_key" ADD CONSTRAINT "custom_provider_key_provider_id_custom_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "custom_provider"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "custom_provider_model" ADD CONSTRAINT "custom_provider_model_provider_id_custom_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "custom_provider"("id") ON DELETE CASCADE;
