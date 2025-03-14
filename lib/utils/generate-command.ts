import type { JsonObject } from "@/lib/types/json"
import type { FetchedServer } from "@/lib/utils/get-server"

/* Supported clients */
type ClientType = "claude" | "cline" | "cursor" | "windsurf" | "witsy" | "enconvo" | "goose" | "spinai"

/* Client behaviour constants */
const CLIENTS_USING_RUN_COMMAND = ["cursor", "goose"] as const
const CLIENTS_USING_CUSTOM_INSTALL = ["spinai"] as const

const isRunCommandClient = (client: ClientType): boolean => 
  CLIENTS_USING_RUN_COMMAND.includes(client as typeof CLIENTS_USING_RUN_COMMAND[number])

const isCustomInstallClient = (client: ClientType): boolean =>
  CLIENTS_USING_CUSTOM_INSTALL.includes(client as typeof CLIENTS_USING_CUSTOM_INSTALL[number])

/* Windows execution methods */
export enum WindowsExecMethod {
  SCOOP = "SCOOP",           // Direct via smithery CLI
  CMD = "CMD",               // cmd /c
  CMD_FULL = "CMD_FULL"      // C:\Windows\System32\cmd.exe /c
}

/* Replaces undefined values with empty string ! workaround - fix yet to be implemented */
const cleanConfig = (config?: JsonObject): JsonObject => {
  if (!config) return {}
  return Object.entries(config).reduce((acc, [key, value]) => {
    acc[key] = value === undefined ? "" : value
    return acc
  }, {} as JsonObject)
}

/* Windows command generators */
export const generateWindowsCommand = (
  method: WindowsExecMethod,
  baseCommand: string
): string => {
  switch (method) {
    case WindowsExecMethod.SCOOP:
      return baseCommand.replace('npx -y @smithery/cli@latest', 'smithery')
    case WindowsExecMethod.CMD:
      return `cmd /c ${baseCommand}`
    case WindowsExecMethod.CMD_FULL:
      return `C:\\Windows\\System32\\cmd.exe /c ${baseCommand}`
  }
}

/* Unix command generator */
export const generateUnixCommand = (baseCommand: string): string => baseCommand

/* Command templates */
const COMMAND_TEMPLATES = {
  STANDARD_INSTALL: 'npx -y @smithery/cli@latest install {serverName} --client {clientName}',
  STANDARD_RUN: 'npx -y @smithery/cli@latest run {serverName} --config {config}',
  SPINAI_INSTALL: 'npx spinai-mcp install {serverName} --provider smithery',
  SPINAI_RUN: 'npx spinai-mcp install {serverName} --provider smithery --config {config}'
} as const

/* Command builder helper */
const buildCommand = (
  template: string, 
  params: Record<string, string>
): string => {
  return Object.entries(params).reduce(
    (cmd, [key, value]) => cmd.replace(`{${key}}`, value),
    template
  )
}

export const generateInstallCommand = (
  server: FetchedServer,
  client: ClientType
): string => {
  const template = isCustomInstallClient(client) 
    ? COMMAND_TEMPLATES.SPINAI_INSTALL
    : COMMAND_TEMPLATES.STANDARD_INSTALL

  return buildCommand(template, {
    serverName: server.qualifiedName,
    clientName: client
  })
}

export const generateRunCommand = (
  server: FetchedServer,
  client: ClientType,
  config?: JsonObject
): string => {
  const cleanedConfig = JSON.stringify(JSON.stringify(cleanConfig(config)))
  const template = isCustomInstallClient(client)
    ? COMMAND_TEMPLATES.SPINAI_RUN
    : COMMAND_TEMPLATES.STANDARD_RUN

  return buildCommand(template, {
    serverName: server.qualifiedName,
    config: cleanedConfig
  })
}

// Main command generator that puts it all together
export const generateCommand = ({
  server,
  client,
  config,
  isWindows = false,
  windowsMethod = WindowsExecMethod.SCOOP,
}: {
  server: FetchedServer
  client: ClientType
  config?: JsonObject
  isWindows?: boolean
  windowsMethod?: WindowsExecMethod
}): string => {
  // Determine command type based on client
  const baseCommand = isRunCommandClient(client)
    ? generateRunCommand(server, client, config)
    : generateInstallCommand(server, client)

  // Apply OS-specific formatting
  return isWindows 
    ? generateWindowsCommand(windowsMethod, baseCommand)
    : generateUnixCommand(baseCommand)
}
