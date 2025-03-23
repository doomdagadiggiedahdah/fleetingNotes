import { getServerName } from "@/lib/utils/normalise-id"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { JsonObject } from "@/lib/types/json"

/* Generates the formatted MCP JSON configuration for Cursor integration */
export function generateMcpJsonConfig(
	server: FetchedServer,
	cleanedConfig?: JsonObject,
	isWindows = false,
	apiKey?: string,
	usingSavedConfig?: boolean,
): string {
	// Base arguments for npx command
	const npxArgs = ["-y", "@smithery/cli@latest", "run", server.qualifiedName]

	// Use --key flag with API key if using saved config, otherwise use --config with encoded config
	if (usingSavedConfig && apiKey) {
		npxArgs.push("--key", apiKey)
	} else {
		// Use simple stringification for config
		const encodedConfig = cleanedConfig
			? JSON.stringify(cleanedConfig)
			: "<your-config-here>"
		npxArgs.push("--config", encodedConfig)
	}

	let commandConfig: { command: string; args: string[] }

	// Use cmd /c for Windows platforms
	if (isWindows) {
		commandConfig = {
			command: "cmd",
			args: ["/c", "npx", ...npxArgs],
		}
	} else {
		// Default for non-Windows platforms
		commandConfig = {
			command: "npx",
			args: npxArgs,
		}
	}

	const mcpConfig = {
		mcpServers: {
			[getServerName(server.qualifiedName)]: commandConfig,
		},
	}

	return JSON.stringify(mcpConfig, null, 2)
}
