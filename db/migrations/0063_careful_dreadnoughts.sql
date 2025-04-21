CREATE TABLE "server_name_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" uuid NOT NULL,
	"alias_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "server_name_aliases_alias_name_unique" UNIQUE("alias_name")
);
--> statement-breakpoint
ALTER TABLE "server_name_aliases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "server_name_aliases" ADD CONSTRAINT "server_name_aliases_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alias_name_idx" ON "server_name_aliases" USING btree ("alias_name");