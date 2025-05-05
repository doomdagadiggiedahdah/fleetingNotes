ALTER TABLE "server_usage_counts" ADD COLUMN "invalid_request_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "server_usage_counts" ADD COLUMN "invalid_params_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "server_usage_counts" ADD COLUMN "internal_error_count" integer DEFAULT 0 NOT NULL;