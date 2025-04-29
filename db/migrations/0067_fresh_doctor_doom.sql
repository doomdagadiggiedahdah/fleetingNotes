ALTER TABLE "saved_configs" DROP CONSTRAINT "saved_configs_owner_users_id_fk";
--> statement-breakpoint
ALTER TABLE "saved_configs" ALTER COLUMN "profile_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "saved_configs" DROP COLUMN "owner";