DROP POLICY "Users can read deployments for their servers" ON "deployments";
CREATE POLICY "Users can read deployments for their servers" ON "deployments" TO authenticated USING (
			EXISTS (
				SELECT 1 FROM "servers"
				WHERE "servers"."id" = "deployments"."server_id"
				AND "servers"."owner" = auth.uid()
			));
DROP POLICY "Users can read their servers" ON "servers" CASCADE;