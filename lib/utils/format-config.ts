import { getServerName } from "@/lib/utils/normalise-id"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { JsonObject } from "@/lib/types/json"

/* Generates the formatted MCP JSON configuration for Cursor integration */
export function generateMcpJsonConfig(
	server: FetchedServer,
	apiKey: string,
	cleanedConfig?: JsonObject,
	isWindows = false,
	usingSavedConfig?: boolean,
	isWsl = false,
): string {
	// Base arguments for npx command
	const npxArgs = ["-y", "@smithery/cli@latest", "run", server.qualifiedName]

	// Add config if not using saved config
	if (!usingSavedConfig && cleanedConfig) {
		const encodedConfig = JSON.stringify(cleanedConfig)
		npxArgs.push("--config", encodedConfig)
	}

	// Always attach API key if provided
	if (apiKey) {
		npxArgs.push("--key", apiKey)
	}

	let commandConfig: { command: string; args: string[] }

	// Use cmd /c for Windows platforms
	if (isWindows) {
		commandConfig = {
			command: "cmd",
			args: ["/c", "npx", ...npxArgs],
		}
	} else if (isWsl) {
		commandConfig = {
			command: "wsl",
			args: ["npx", ...npxArgs],
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
