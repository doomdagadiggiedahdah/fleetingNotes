CREATE MATERIALIZED VIEW "public"."server_usage_counts" AS (select 
				CASE
					WHEN "payload"->>'serverId'
						~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
					THEN CAST("payload"->>'serverId' AS uuid)
					ELSE NULL
				END
				 as "serverId", COUNT(*) as "useCount" from "events" where ("events"."event_name" = 'tool_call' and "events"."timestamp" > NOW() - INTERVAL '1 month') group by "serverId");