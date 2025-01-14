CREATE POLICY "Users can read their servers" ON "servers" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = owner);
CREATE POLICY "Users can read deployments for their servers" ON "deployments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (
			EXISTS (
				SELECT 1 FROM "servers"
				WHERE "servers"."id" = "deployments"."server_id"
				AND "servers"."owner" = auth.uid()
			));