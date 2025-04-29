import type { FetchedServer } from "@/lib/utils/get-server"
import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { ToolsPanel } from "./tool-panel"
import { fetchData } from "../overview/side-panel/fetch-data"
import { Suspense } from "react"
import { ToolsPanelSkeleton } from "./skeleton"
import { MCPProvider } from "@/context/mcp-context"
import { LoginError } from "../overview/side-panel/error/login-error"
import { ApiKeyError } from "../overview/side-panel/error/api-key-error"
import { ProfilesError } from "../overview/side-panel/error/profiles-error"

interface ServerTabsProps {
	server: FetchedServer
}

export async function ToolPanelContainer({ server }: ServerTabsProps) {
	const tools = (server.tools as Tool[]) ?? []
	const configSchema = server.configSchema ?? undefined

	// Use the existing fetch-data function
	const result = await fetchData(server.id)

	// If user is not logged in, show the LoginError component
	if (result.type === "not_logged_in") {
		return <LoginError message="Login to access the server playground." />
	}

	// If there's an API key error, show the ApiKeyError component
	if (result.type === "api_key_error") {
		return <ApiKeyError message={result.error} />
	}

	// If there's a profiles error, show the ProfilesError component
	if (result.type === "profiles_error") {
		return <ProfilesError message={result.error} />
	}

	return (
		<Suspense fallback={<ToolsPanelSkeleton />}>
			<MCPProvider>
				<ToolsPanel
					server={server}
					tools={tools}
					showConfigForm={true}
					configSchema={configSchema}
					profiles={result.data.profiles}
				/>
			</MCPProvider>
		</Suspense>
	)
}
