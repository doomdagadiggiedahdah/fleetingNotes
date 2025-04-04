DROP TABLE "events" CASCADE;--> statement-breakpoint
ALTER TABLE "servers" ADD COLUMN "env" jsonb DEFAULT '{}'::jsonb NOT NULL;