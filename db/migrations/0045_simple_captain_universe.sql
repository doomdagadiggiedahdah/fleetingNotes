-- DROP TABLE "saved_configs";
CREATE TABLE "saved_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" uuid NOT NULL,
	"config_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "saved_configs" ADD COLUMN "owner" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "saved_configs" ADD CONSTRAINT "saved_configs_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_configs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "saved_configs" ADD CONSTRAINT "saved_configs_owner_users_id_fk" FOREIGN KEY ("owner") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;