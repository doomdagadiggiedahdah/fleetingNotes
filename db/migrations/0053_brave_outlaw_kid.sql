DROP MATERIALIZED VIEW "public"."server_usage_counts";--> statement-breakpoint
CREATE TABLE "server_usage_counts" (
	"server_id" uuid PRIMARY KEY NOT NULL,
	"use_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "server_usage_counts" ADD CONSTRAINT "server_usage_counts_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;