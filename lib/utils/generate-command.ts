import type { JsonObject } from "@/lib/types/json"
import type { FetchedServer } from "@/lib/utils/get-server"

/* Supported clients */
export type ClientType =
	| "claude"
	| "cline"
	| "cursor"
	| "windsurf"
	| "witsy"
	| "enconvo"
	| "goose"
	| "spinai"

/* Client configuration */
interface ClientConfig {
	usesRunCommand: boolean
	usesCustomInstall: boolean
}

/* Client specific configurations */
const CLIENT_CONFIGS: Record<ClientType, ClientConfig> = {
	claude: { usesRunCommand: false, usesCustomInstall: false },
	cline: { usesRunCommand: false, usesCustomInstall: false },
	cursor: { usesRunCommand: false, usesCustomInstall: false },
	windsurf: { usesRunCommand: false, usesCustomInstall: false },
	witsy: { usesRunCommand: false, usesCustomInstall: false },
	enconvo: { usesRunCommand: false, usesCustomInstall: false },
	goose: { usesRunCommand: true, usesCustomInstall: false },
	spinai: { usesRunCommand: false, usesCustomInstall: true },
}

const isRunCommandClient = (client: ClientType): boolean =>
	CLIENT_CONFIGS[client].usesRunCommand

// Feels a little off to have a custom client - but keep for now
const isCustomInstallClient = (client: ClientType): boolean =>
	CLIENT_CONFIGS[client].usesCustomInstall

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

		// Otherwise use config if provided
		return config
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
		return `${NPX_SMITHERY_PREFIX} run ${serverName} --config ${config}`
	},
	SPINAI_INSTALL: (serverName: string, config?: string) =>
		config
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
		? JSON.stringify(JSON.stringify(cleanConfig(config)))
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
	const cleanedConfig = JSON.stringify(JSON.stringify(cleanConfig(config)))
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

/* Replaces undefined values with empty string ! workaround - fix yet to be implemented */
export const cleanConfig = (config?: JsonObject): JsonObject => {
	if (!config) return {}

	return Object.fromEntries(
		Object.entries(config).map(([key, value]) => [
			key,
			value === undefined ? "" : value,
		]),
	)
}
