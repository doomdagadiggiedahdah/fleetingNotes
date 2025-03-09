ALTER TABLE "servers" ALTER COLUMN "verified" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "owner" SET NOT NULL;--> statement-breakpoint
DROP POLICY "Users can manage their configs" ON "configs" CASCADE;--> statement-breakpoint
DROP POLICY "Users can manage their profiles" ON "profiles" CASCADE;