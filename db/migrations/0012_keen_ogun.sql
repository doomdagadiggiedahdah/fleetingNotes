ALTER TABLE "pull_requests" RENAME COLUMN "server_id" TO "server_repo";--> statement-breakpoint
ALTER TABLE "pull_requests" DROP CONSTRAINT "pull_requests_server_id_servers_id_fk";
--> statement-breakpoint
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_server_repo_server_repos_id_fk" FOREIGN KEY ("server_repo") REFERENCES "public"."server_repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_server_repo_unique" UNIQUE("server_repo");