import type { JSONSchema } from "./server"

export type Server = {
	id: string
	displayName: string
	qualifiedName: string
	iconUrl: string | null
	homepage: string | null
	configSchema: JSONSchema
	description: string
}

export type ProfileServers = {
	// profile
	id: string
	displayName: string
	qualifiedName: string
	is_default?: boolean
	createdAt: string
	// associated servers
	servers: Server[]
}

// could be improved?
// we should include serverId
export type ProfileWithSavedConfig = {
	id: string
	displayName: string
	qualifiedName: string
	is_default?: boolean
	createdAt: Date
	savedConfig: JSONSchema | null // saved config associated with the server
}

export type ProfileWithConfiguredServer = Omit<ProfileServers, "servers"> & {
	servers: Array<Server & { savedConfig: JSONSchema | null }>
}
