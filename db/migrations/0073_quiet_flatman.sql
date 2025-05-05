ALTER TABLE "servers" ADD COLUMN "tools" jsonb;--> statement-breakpoint
ALTER TABLE "servers" ADD COLUMN "config_schema" jsonb;--> statement-breakpoint

-- Migration that copies tools and configSchema from deployments table back to the servers table
-- This undoes the migration in 0070_furry_doomsday.sql

WITH latest_deployments AS (
  SELECT DISTINCT ON (server_id) 
    id,
    server_id
  FROM deployments
  WHERE status = 'SUCCESS'
  ORDER BY server_id, created_at DESC
)
UPDATE servers
SET 
  tools = deployments.tools,
  config_schema = deployments.config_schema
FROM latest_deployments
JOIN deployments ON deployments.id = latest_deployments.id
WHERE servers.id = latest_deployments.server_id
  AND (deployments.tools IS NOT NULL OR deployments.config_schema IS NOT NULL);
