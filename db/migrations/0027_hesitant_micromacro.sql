CREATE TABLE "pull_requests_failures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_repo" uuid NOT NULL,
	"pr_task" "pr_task" NOT NULL,
	"error" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pull_requests_failures_server_repo_unique" UNIQUE("server_repo")
);
--> statement-breakpoint
ALTER TABLE "pull_requests_failures" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pull_requests_failures" ADD CONSTRAINT "pull_requests_failures_server_repo_server_repos_id_fk" FOREIGN KEY ("server_repo") REFERENCES "public"."server_repos"("id") ON DELETE cascade ON UPDATE no action;