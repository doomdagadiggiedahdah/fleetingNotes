-- Migration that copies tools and configSchema from servers table to the latest deployment for each server
-- For each server, find its latest deployment and update it with the server's tools and configSchema

-- Update the tools and configSchema in the latest deployments
WITH latest_deployments AS (
  SELECT DISTINCT ON (server_id) 
    id,
    server_id
  FROM deployments
  WHERE status = 'SUCCESS'
  ORDER BY server_id, created_at DESC
)
UPDATE deployments
SET 
  tools = servers.tools,
  config_schema = servers.config_schema
FROM latest_deployments
JOIN servers ON servers.id = latest_deployments.server_id
WHERE deployments.id = latest_deployments.id
  AND (servers.tools IS NOT NULL OR servers.config_schema IS NOT NULL);
