import { ClientSelector } from "./client-selector"
import { JsonBlock } from "./blocks/json-block"
import { UrlBlock } from "./blocks/url-block"
import { InstallLogin } from "./install-login"
import type { ClientType } from "@/lib/config/clients"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { JsonObject } from "@/lib/types/json"
import type { InstallTabStates } from "./index"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface InstallPreviewProps {
	activeTab: InstallTabStates
	selectedClient: ClientType | null
	onClientChange: (client: ClientType) => void
	server: FetchedServer
	apiKey: string | undefined
	configValues: JsonObject
}

export function InstallPreview({
	activeTab,
	selectedClient,
	onClientChange,
	server,
	apiKey,
	configValues,
}: InstallPreviewProps) {
	const { currentSession, stateChangedOnce } = useAuth()
	const router = useRouter()

	useEffect(() => {
		if (stateChangedOnce && currentSession) {
			router.refresh()
		}
	}, [stateChangedOnce, currentSession, router])

	return (
		<div className="relative">
			<div className="blur-[2px] pointer-events-none">
				{activeTab === "auto" ? (
					<ClientSelector
						selectedClient={selectedClient}
						onClientChange={onClientChange}
					/>
				) : activeTab === "manual" ? (
					<JsonBlock
						server={server}
						apiKey={apiKey || ""}
						cleanedConfig={configValues}
					/>
				) : (
					<UrlBlock
						server={server}
						apiKey={apiKey || ""}
						config={configValues}
					/>
				)}
			</div>
			<div className="absolute inset-0 flex items-center justify-center bg-background/80">
				<InstallLogin hideTitle={true} />
			</div>
		</div>
	)
}
