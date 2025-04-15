CREATE TABLE "server_scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" uuid NOT NULL,
	"scan_at" timestamp DEFAULT now() NOT NULL,
	"is_secure" boolean,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "server_scans" ADD CONSTRAINT "server_scans_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;