import { fetchConfigSchema } from "@/lib/utils/fetch-config"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { JSONSchema } from "@/lib/types/server"

export async function prefetchServerConfig(server: FetchedServer) {
  // Fetch server config schema
  let configSchema: JSONSchema | null = null;
  
  if (server.deploymentUrl) {
    const schemaResult = await fetchConfigSchema(server.deploymentUrl);
    if (schemaResult.ok) {
      configSchema = schemaResult.value;
    }
  } else {
    // Get schema from stdio connection if available
    const stdioConnection = server.connections.find(
      (conn) => conn.type === "stdio",
    );
    if (stdioConnection) {
      configSchema = stdioConnection.configSchema;
    }
  }
  
  // No longer setting a default empty schema
  // Let configSchema remain null if no schema was found
  
  return {
    configSchema
  };
} 