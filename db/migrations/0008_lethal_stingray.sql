ALTER TABLE "server_repos" DROP CONSTRAINT "server_repos_server_id_servers_id_fk";
--> statement-breakpoint
ALTER TABLE "server_repos" ADD CONSTRAINT "server_repos_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;