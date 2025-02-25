CREATE TABLE "build_cache" (
	"server_id" uuid NOT NULL,
	"files" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "build_cache" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "build_cache" ADD CONSTRAINT "build_cache_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;