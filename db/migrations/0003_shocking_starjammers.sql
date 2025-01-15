ALTER TABLE "servers" DROP COLUMN "vendor";--> statement-breakpoint
ALTER TABLE "server_repos" ADD CONSTRAINT "server_repos_server_id_type_unique" UNIQUE("server_id","type");