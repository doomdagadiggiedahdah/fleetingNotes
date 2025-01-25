ALTER TABLE "servers" ALTER COLUMN "embedding" SET DATA TYPE vector(1536);--> statement-breakpoint
ALTER TABLE "servers" DROP COLUMN "tags";