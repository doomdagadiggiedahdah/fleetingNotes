ALTER TABLE "deployments" DROP CONSTRAINT "deployments_server_id_servers_id_fk";
--> statement-breakpoint
ALTER TABLE "deployments" DROP CONSTRAINT "deployments_repo_server_repos_id_fk";
--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_repo_server_repos_id_fk" FOREIGN KEY ("repo") REFERENCES "public"."server_repos"("id") ON DELETE cascade ON UPDATE no action;