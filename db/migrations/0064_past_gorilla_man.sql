ALTER TABLE "server_name_aliases" RENAME TO "server_aliases";--> statement-breakpoint
ALTER TABLE "server_aliases" RENAME COLUMN "alias_name" TO "alias";--> statement-breakpoint
ALTER TABLE "server_aliases" DROP CONSTRAINT "server_name_aliases_alias_name_unique";--> statement-breakpoint
ALTER TABLE "server_aliases" DROP CONSTRAINT "server_name_aliases_server_id_servers_id_fk";
--> statement-breakpoint
DROP INDEX "alias_name_idx";--> statement-breakpoint
ALTER TABLE "server_aliases" ADD CONSTRAINT "server_aliases_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alias_idx" ON "server_aliases" USING btree ("alias");--> statement-breakpoint
ALTER TABLE "server_aliases" ADD CONSTRAINT "server_aliases_alias_unique" UNIQUE("alias");