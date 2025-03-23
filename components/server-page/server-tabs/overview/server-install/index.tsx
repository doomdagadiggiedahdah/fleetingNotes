import type { FetchedServer } from "@/lib/utils/get-server"
import { Installtabs, type InstallTabStates } from "./install-tabs"
import { getServerConfigSchema } from "@/components/server-page/server-tabs/configure/prefetch-schema"

type Props = {
	server: FetchedServer
	initTab?: InstallTabStates
	onTabChange?: (tab: InstallTabStates) => void
}

export function ServerInstall({
	server,
	initTab = "claude",
	onTabChange,
}: Props) {
	// Prefetch config schema
	const configSchema = getServerConfigSchema(server)

	return (
		<div>
			<h2 className="text-2xl font-bold mb-4">Installation</h2>
			<div className="bg-background p-3 rounded-lg border border-border">
				<Installtabs
					key={`install-tabs-${Date.now()}`}
					server={server}
					initTab={initTab}
					onTabChange={onTabChange}
					configSchema={configSchema}
				/>
			</div>
		</div>
	)
}
