-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."deployment_status" AS ENUM('QUEUED', 'WORKING', 'SUCCESS', 'FAILURE', 'INTERNAL_ERROR');--> statement-breakpoint
CREATE TYPE "public"."provider" AS ENUM('github');--> statement-breakpoint
CREATE TABLE "server_repos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" uuid NOT NULL,
	"type" "provider" NOT NULL,
	"repo_owner" text NOT NULL,
	"repo_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "server_repos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pr_queue" (
	"server_id" text PRIMARY KEY NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"errored" boolean DEFAULT false NOT NULL,
	"pr_url" text,
	"created_at" timestamp DEFAULT now(),
	"checked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pr_queue" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "servers" (
	"qualifiedName" text NOT NULL,
	"displayName" text NOT NULL,
	"description" text NOT NULL,
	"vendor" text,
	"source_url" text NOT NULL,
	"license" text,
	"homepage" text,
	"verified" boolean DEFAULT false,
	"connections" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"crawl_url" text,
	"remote" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"checked" boolean DEFAULT false NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner" uuid,
	"deployment_url" text,
	CONSTRAINT "servers_qualifiedName_unique" UNIQUE("qualifiedName")
);
--> statement-breakpoint
ALTER TABLE "servers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "deployments" (
	"id" text PRIMARY KEY NOT NULL,
	"server_id" uuid NOT NULL,
	"status" "deployment_status" NOT NULL,
	"commit" text NOT NULL,
	"commit_message" text NOT NULL,
	"repo" uuid NOT NULL,
	"branch" text NOT NULL,
	"deployment_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deployments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "events" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_name" text NOT NULL,
	"user_id" uuid,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"payload" jsonb
);
--> statement-breakpoint
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "candidate_urls" (
	"crawl_url" text PRIMARY KEY NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"errored" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidate_urls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "server_repos" ADD CONSTRAINT "server_repos_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servers" ADD CONSTRAINT "servers_owner_users_id_fk" FOREIGN KEY ("owner") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_repo_server_repos_id_fk" FOREIGN KEY ("repo") REFERENCES "public"."server_repos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE no action ON UPDATE no action;
*/