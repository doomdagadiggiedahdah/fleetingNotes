ALTER TABLE "servers" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
CREATE INDEX "embeddingIndex" ON "servers" USING hnsw ("embedding" vector_ip_ops);