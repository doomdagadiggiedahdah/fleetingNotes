ALTER TABLE "api_keys" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "is_default" boolean DEFAULT false;--> statement-breakpoint
CREATE UNIQUE INDEX "default_key_per_owner" ON "api_keys" USING btree ("owner","is_default") WHERE "api_keys"."is_default" = true;