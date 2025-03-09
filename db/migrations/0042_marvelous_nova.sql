CREATE TABLE "saved_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" uuid NOT NULL,
	"config_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_configs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "configs" CASCADE;--> statement-breakpoint
DROP TABLE "profiles" CASCADE;--> statement-breakpoint
-- ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_profile_id_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "owner" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "saved_configs" ADD CONSTRAINT "saved_configs_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" DROP COLUMN "profile_id";