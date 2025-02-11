DROP MATERIALIZED VIEW "public"."server_usage_counts";--> statement-breakpoint
CREATE MATERIALIZED VIEW "public"."server_usage_counts" AS (select 
				CASE
					WHEN "payload"->>'serverId'
						~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
					THEN CAST("payload"->>'serverId' AS uuid)
					ELSE NULL
				END
				 as "serverId", COUNT(*) as "useCount" from "events" where (
				CASE
					WHEN "events"."payload"->>'serverId'
						~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
					THEN CAST("events"."payload"->>'serverId' AS uuid)
					ELSE NULL
				END
				 is not null and "events"."event_name" = 'tool_call' and "events"."timestamp" > NOW() - INTERVAL '1 month') group by "serverId");
REVOKE ALL ON private.server_usage_counts FROM anon;
GRANT SELECT ON private.server_usage_counts TO authenticated;