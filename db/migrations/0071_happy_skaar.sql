ALTER TABLE "build_cache" DROP CONSTRAINT "build_cache_server_id_unique";--> statement-breakpoint
ALTER TABLE "build_cache" ADD PRIMARY KEY ("server_id");