import type { JsonObject } from "@/lib/types/json"
import type { FetchedServer } from "@/lib/utils/get-server"
import { CLIENTS_CONFIG, type ClientType } from "@/lib/config/clients"

const isRunCommandClient = (client: ClientType): boolean =>
	CLIENTS_CONFIG[client].usesRunCommand

const isCustomInstallClient = (client: ClientType): boolean =>
	CLIENTS_CONFIG[client].usesCustomInstall

/* Windows execution methods */
export enum WindowsExecMethod {
	SCOOP = "SCOOP", // Direct via smithery CLI
	CMD = "CMD", // cmd /c
	CMD_FULL = "CMD_FULL", // C:\Windows\System32\cmd.exe /c
}

/* Command templates */
const NPX_SMITHERY_PREFIX = `npx -y @smithery/cli@latest`
const NPX_SPINAI_PREFIX = `npx spinai-mcp`

const COMMAND_TEMPLATES = {
	STANDARD_INSTALL: (
		serverName: string,
		clientName: string,
		apiKey: string,
		config?: string,
		usingSavedConfig?: boolean,
	) => {
		// Base command with server and client
		let command = `${NPX_SMITHERY_PREFIX} install ${serverName} --client ${clientName}`

		// Add config if not using saved config and config exists and is not empty
		if (!usingSavedConfig && config && config !== '"{}"') {
			command += ` --config ${config}`
		}

		// Always attach API key at the end
		command += ` --key ${apiKey}`
		return command
	},
	STANDARD_RUN: (
		serverName: string,
		config: string,
		apiKey?: string,
		usingSavedConfig?: boolean,
	) => {
		// Base command with server
		let command = `${NPX_SMITHERY_PREFIX} run ${serverName}`

		// Add config if not using saved config and config is not empty
		if (!usingSavedConfig && config !== '"{}"') {
			command += ` --config ${config}`
		}

		// Always attach API key at the end
		if (apiKey) {
			command += ` --key ${apiKey}`
		}
		return command
	},
	SPINAI_INSTALL: (serverName: string, config?: string) =>
		config && config !== '"{}"'
			? `${NPX_SPINAI_PREFIX} install ${serverName} --provider smithery --config ${config}`
			: `${NPX_SPINAI_PREFIX} install ${serverName} --provider smithery`,
} as const

/* Platform-specific command generators */
const platformHandlers = {
	windows: {
		[WindowsExecMethod.SCOOP]: (cmd: string) =>
			cmd.replace(NPX_SMITHERY_PREFIX, "smithery"),
		[WindowsExecMethod.CMD]: (cmd: string) => `cmd /c ${cmd}`,
		[WindowsExecMethod.CMD_FULL]: (cmd: string) =>
			`C:\\Windows\\System32\\cmd.exe /c ${cmd}`,
	},
	unix: (cmd: string) => cmd,
}

/* Windows command generator */
export const generateWindowsCommand = (
	method: WindowsExecMethod,
	baseCommand: string,
): string => platformHandlers.windows[method](baseCommand)

/* Unix command generator */
export const generateUnixCommand = (baseCommand: string): string =>
	platformHandlers.unix(baseCommand)

/* Install command */
export const generateInstallCommand = (
	server: FetchedServer,
	client: ClientType,
	apiKey: string,
	config?: JsonObject,
	usingSavedConfig?: boolean,
): string => {
	const cleanedConfig = config
		? `'${JSON.stringify(JSON.stringify(config))}'`
		: undefined

	return isCustomInstallClient(client)
		? COMMAND_TEMPLATES.SPINAI_INSTALL(server.qualifiedName, cleanedConfig)
		: COMMAND_TEMPLATES.STANDARD_INSTALL(
				server.qualifiedName,
				client,
				apiKey,
				cleanedConfig,
				usingSavedConfig,
			)
}

/* Run command */
export const generateRunCommand = (
	server: FetchedServer,
	client: ClientType,
	apiKey: string,
	config?: JsonObject,
	usingSavedConfig?: boolean,
): string => {
	const cleanedConfig = JSON.stringify(JSON.stringify(config))
	return isCustomInstallClient(client)
		? COMMAND_TEMPLATES.SPINAI_INSTALL(server.qualifiedName, cleanedConfig)
		: COMMAND_TEMPLATES.STANDARD_RUN(
				server.qualifiedName,
				cleanedConfig,
				apiKey,
				usingSavedConfig,
			)
}

type Platform = "unix" | "windows"

// Main command generator
export const generateCommand = ({
	server,
	client,
	config,
	apiKey,
	usingSavedConfig,
	platform = "unix",
	windowsMethod = WindowsExecMethod.SCOOP,
}: {
	server: FetchedServer
	client: ClientType
	apiKey: string
	config?: JsonObject
	usingSavedConfig?: boolean
	platform?: Platform
	windowsMethod?: WindowsExecMethod
}): string => {
	// Keep run vs install distinction, but both now support config
	const baseCommand = isRunCommandClient(client)
		? generateRunCommand(server, client, apiKey, config, usingSavedConfig)
		: generateInstallCommand(server, client, apiKey, config, usingSavedConfig)

	return platform === "windows"
		? generateWindowsCommand(windowsMethod, baseCommand)
		: generateUnixCommand(baseCommand)
}

type CommandSet = {
	unixCommand: string
	windowsScoopCommand: string
	windowsCmdCommand: string
	windowsCmdFullCommand: string
}

/* Complete command set */
export const generateCommandSet = ({
	server,
	client,
	config,
	apiKey,
	usingSavedConfig,
}: {
	server: FetchedServer
	client: ClientType
	apiKey: string
	config?: JsonObject
	usingSavedConfig?: boolean
}): CommandSet => {
	return {
		unixCommand: generateCommand({
			server,
			client,
			config,
			apiKey,
			usingSavedConfig,
			platform: "unix",
		}),
		windowsScoopCommand: generateCommand({
			server,
			client,
			config,
			apiKey,
			usingSavedConfig,
			platform: "windows",
			windowsMethod: WindowsExecMethod.SCOOP,
		}),
		windowsCmdCommand: generateCommand({
			server,
			client,
			config,
			apiKey,
			usingSavedConfig,
			platform: "windows",
			windowsMethod: WindowsExecMethod.CMD,
		}),
		windowsCmdFullCommand: generateCommand({
			server,
			client,
			config,
			apiKey,
			usingSavedConfig,
			platform: "windows",
			windowsMethod: WindowsExecMethod.CMD_FULL,
		}),
	}
}

/* Omits undefined values instead of replacing them with empty strings */
export const cleanConfig = (config?: JsonObject): JsonObject => {
	if (!config) return {}
	return Object.fromEntries(
		Object.entries(config).filter(
			([_, value]) => value !== undefined && value !== "",
		),
	)
}
