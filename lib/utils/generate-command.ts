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
		config?: string,
		apiKey?: string,
		usingSavedConfig?: boolean,
	) => {
		// For saved config with API key, use --key instead of --config
		if (usingSavedConfig && apiKey) {
			return `${NPX_SMITHERY_PREFIX} install ${serverName} --client ${clientName} --key ${apiKey}`
		}

		// Only add the --config flag if config is provided and not empty
		return config && config !== '"{}"'
			? `${NPX_SMITHERY_PREFIX} install ${serverName} --client ${clientName} --config ${config}`
			: `${NPX_SMITHERY_PREFIX} install ${serverName} --client ${clientName}`
	},
	STANDARD_RUN: (
		serverName: string,
		config: string,
		apiKey?: string,
		usingSavedConfig?: boolean,
	) => {
		// For saved config with API key, use --key instead of --config
		if (usingSavedConfig && apiKey) {
			return `${NPX_SMITHERY_PREFIX} run ${serverName} --key ${apiKey}`
		}

		// Only add the --config flag if config is not empty
		return config !== '"{}"'
			? `${NPX_SMITHERY_PREFIX} run ${serverName} --config ${config}`
			: `${NPX_SMITHERY_PREFIX} run ${serverName}`
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
	config?: JsonObject,
	apiKey?: string,
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
				cleanedConfig,
				apiKey,
				usingSavedConfig,
			)
}

/* Run command */
export const generateRunCommand = (
	server: FetchedServer,
	client: ClientType,
	config?: JsonObject,
	apiKey?: string,
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
	config?: JsonObject
	apiKey?: string
	usingSavedConfig?: boolean
	platform?: Platform
	windowsMethod?: WindowsExecMethod
}): string => {
	// Keep run vs install distinction, but both now support config
	const baseCommand = isRunCommandClient(client)
		? generateRunCommand(server, client, config, apiKey, usingSavedConfig)
		: generateInstallCommand(server, client, config, apiKey, usingSavedConfig)

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
	config?: JsonObject
	apiKey?: string
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
