import { normalizeId } from "@/lib/utils/normalise-id"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { JsonObject } from "@/lib/types/json"

/* Generates the formatted MCP JSON configuration for Cursor integration */
export function generateMcpJsonConfig(
  server: FetchedServer,
  cleanedConfig?: JsonObject,
  isWindows: boolean = false
): string {
  // Use simple stringification for config
  const encodedConfig = cleanedConfig 
    ? JSON.stringify(cleanedConfig)
    : "<your-config-here>";
  
  // Base arguments for npx command
  const npxArgs = [
    "-y",
    "@smithery/cli@latest",
    "run",
    server.qualifiedName,
    "--config",
    encodedConfig,
  ];
  
  let commandConfig;
  
  // Use cmd /c for Windows platforms
  if (isWindows) {
    commandConfig = {
      command: "cmd",
      args: ["/c", "npx", ...npxArgs],
    };
  } else {
    // Default for non-Windows platforms
    commandConfig = {
      command: "npx",
      args: npxArgs,
    };
  }
  
  const mcpConfig = {
    mcpServers: {
      [normalizeId(server.qualifiedName)]: commandConfig
    },
  };

  return JSON.stringify(mcpConfig, null, 2)
}
