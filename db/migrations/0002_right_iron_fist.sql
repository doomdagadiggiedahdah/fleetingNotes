ALTER POLICY "Users can read deployments for their servers" ON "deployments" TO authenticated USING (
			EXISTS (
				SELECT 1 FROM "servers"
				WHERE "servers"."id" = "deployments"."server_id"
				AND "servers"."owner" = auth.uid()
			));
ALTER TABLE "server_repos" ADD CONSTRAINT "server_repos_server_id_type_unique" UNIQUE("server_id","type");