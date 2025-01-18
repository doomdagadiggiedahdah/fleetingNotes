CREATE TYPE "public"."pr_task" AS ENUM('config', 'readme');--> statement-breakpoint
CREATE TABLE "pull_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" uuid NOT NULL,
	"pr_task" "pr_task" NOT NULL,
	"pr_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pull_requests_pr_url_unique" UNIQUE("pr_url")
);
--> statement-breakpoint
ALTER TABLE "pull_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;