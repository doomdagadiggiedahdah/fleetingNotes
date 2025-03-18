import type { FetchedServer } from "@/lib/utils/get-server"
import { InstallationTabs, type InstallTabStates } from "./install/install-tabs"
import type { JSONSchema } from "@/lib/types/server"

type Props = {
	server: FetchedServer
	initTab?: InstallTabStates
	onTabChange?: (tab: InstallTabStates) => void
	configSchema?: JSONSchema | null
}

export function ServerInstallation({
	server,
	initTab = "claude",
	onTabChange,
	configSchema,
}: Props) {
	return (
		<div>
			<h2 className="text-2xl font-bold mb-4">Installation</h2>
			<div className="bg-background p-3 rounded-lg border border-border">
				<InstallationTabs
					server={server}
					initTab={initTab}
					onTabChange={onTabChange}
					configSchema={configSchema}
				/>
			</div>
		</div>
	)
}
