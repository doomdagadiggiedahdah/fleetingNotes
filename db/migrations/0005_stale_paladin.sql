ALTER TABLE "servers" RENAME COLUMN "qualifiedName" TO "qualified_name";--> statement-breakpoint
ALTER TABLE "servers" RENAME COLUMN "displayName" TO "display_name";--> statement-breakpoint
ALTER TABLE "servers" DROP CONSTRAINT "servers_qualifiedName_unique";--> statement-breakpoint
ALTER TABLE "servers" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "servers" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "servers" DROP COLUMN "deployment_url";--> statement-breakpoint
ALTER TABLE "servers" ADD CONSTRAINT "servers_qualified_name_unique" UNIQUE("qualified_name");