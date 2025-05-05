import { CommandBlock } from "./blocks/command-block"
import { JsonBlock } from "./blocks/json-block"
import { UrlBlock } from "./blocks/url-block"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { JSONSchema } from "@/lib/types/server"
import type { JsonObject } from "@/lib/types/json"
import { ConfigForm } from "../config-form"
import { LoginBlur } from "./login-blur"
import type { Session } from "@supabase/supabase-js"
import type { ClientType } from "@/lib/config/clients"
import { CloudOff } from "lucide-react"
import { extractPrerequisites } from "@/lib/utils/extract-prerequisites"
import { PrerequisitesDisplay } from "./prerequisites-display"
import { cleanConfig } from "@/lib/utils/generate-command"
import type { ProfileWithSavedConfig } from "@/lib/types/profiles"
import { ClientSelector } from "./client-selector"
import { ClientSelect } from "./compact-client-selector"

type InstallTabContentProps = {
	server: FetchedServer
	client: ClientType | null
	configSchema: JSONSchema | null
	isClientConfigured: boolean
	configValues: JsonObject
	onClientConfig: (values: JsonObject, profileId?: string) => Promise<void>
	currentSession: Session | null
	setIsSignInOpen: (open: boolean) => void
	apiKey: string
	usingSavedConfig: boolean
	setUsingSaved: (value: boolean) => void
	onClientChange: (client: ClientType | null) => void
	method: "auto" | "manual" | "url"
	profiles: ProfileWithSavedConfig[]
	selectedProfileQualifiedName?: string
	setSelectedProfileQualifiedName: (name: string | undefined) => void
}

export function InstallTabContent({
	server,
	client,
	configSchema,
	isClientConfigured,
	configValues,
	onClientConfig,
	currentSession,
	setIsSignInOpen,
	apiKey,
	setUsingSaved,
	onClientChange,
	method,
	profiles,
	selectedProfileQualifiedName,
	setSelectedProfileQualifiedName,
}: InstallTabContentProps) {
	// Show error message first if no schema available
	if (!configSchema) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 py-6 text-muted-foreground">
				<CloudOff className="h-8 w-8" />
				<div className="text-center">
					<h3 className="text-xl font-semibold mb-2">Uh oh!</h3>
					<p>There was an error in loading the configuration.</p>
					<button
						onClick={() => window.location.reload()}
						className="text-blue-500 hover:underline mt-2"
					>
						Reload this page
					</button>
				</div>
			</div>
		)
	}

	// If no client is selected, show the full client selector
	if (!client && method === "auto") {
		return (
			<div className="space-y-4">
				<p className="text-md font-medium text-muted-foreground">
					Choose a client to get started
				</p>
				<ClientSelector selectedClient={null} onClientChange={onClientChange} />
			</div>
		)
	}

	// Extract prerequisites information
	const prerequisites = extractPrerequisites(server)

	// Prepare content based on configuration state
	let content: React.ReactNode

	// if client is not configured, always show config form
	if (!isClientConfigured) {
		content = (
			<>
				{method === "auto" && (
					<ClientSelect
						client={client}
						onClientChange={onClientChange}
						className="mb-4 pl-2"
					/>
				)}
				{!server.remote && prerequisites !== "npx" && (
					<PrerequisitesDisplay prerequisites={prerequisites} />
				)}
				<ConfigForm
					schema={configSchema}
					onSubmit={async (values, profileId) => {
						if (profileId && profiles) {
							const selectedProfile = profiles.find((p) => p.id === profileId)
							setSelectedProfileQualifiedName(
								selectedProfile?.qualifiedName ?? "",
							)
						}
						await onClientConfig(values, profileId)
					}}
					onCancel={() => {}}
					onSuccess={() => {}}
					serverId={server.id}
					initialConfig={configValues}
					currentSession={currentSession}
					setIsSignInOpen={setIsSignInOpen}
					onUsingSavedConfig={setUsingSaved}
					profiles={profiles}
					buttonAlignment="start"
					onlySaveAndConnect={true}
				/>
			</>
		)
		// if client configured and method is auto, we show command block
	} else if (method === "auto" && client) {
		content = (
			<>
				<ClientSelect
					client={client}
					onClientChange={onClientChange}
					className="mb-4 pl-2"
				/>
				{!server.remote && prerequisites !== "npx" && (
					<PrerequisitesDisplay prerequisites={prerequisites} />
				)}
				<CommandBlock
					server={server}
					client={client}
					config={configValues}
					apiKey={apiKey}
					usingSavedConfig={true}
					profileQualifiedName={selectedProfileQualifiedName}
				/>
			</>
		)
		// if manual we show JSON block
	} else if (method === "manual") {
		content = (
			<>
				{!server.remote && prerequisites !== "npx" && (
					<PrerequisitesDisplay prerequisites={prerequisites} />
				)}
				<JsonBlock
					server={server}
					cleanedConfig={cleanConfig(configValues)}
					apiKey={apiKey}
					usingSavedConfig={true}
					profileQualifiedName={selectedProfileQualifiedName}
				/>
			</>
		)
		// For url, we show url block
	} else if (method === "url") {
		content = (
			<>
				{!server.remote && prerequisites !== "npx" && (
					<PrerequisitesDisplay prerequisites={prerequisites} />
				)}
				<UrlBlock
					server={server}
					config={configValues}
					apiKey={apiKey}
					usingSavedConfig={true}
					profileQualifiedName={selectedProfileQualifiedName}
				/>
			</>
		)
	}

	const wrappedContent = <div className="space-y-4">{content}</div>

	// If user is not logged in, show login blur
	if (!currentSession) {
		return (
			<LoginBlur
				setIsSignInOpen={setIsSignInOpen}
				promptText="Login to configure client"
			>
				{wrappedContent}
			</LoginBlur>
		)
	}

	return wrappedContent
}
