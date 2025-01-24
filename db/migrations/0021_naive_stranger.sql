CREATE TABLE "api_keys" (
	"api_key" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner" uuid,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_owner_users_id_fk" FOREIGN KEY ("owner") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;