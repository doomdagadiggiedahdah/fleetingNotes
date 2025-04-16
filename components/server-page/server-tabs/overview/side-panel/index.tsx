import type { FetchedServer } from "@/lib/utils/get-server"
import { Installtabs, type InstallTabStates } from "./install-tabs"
import { ServerStats } from "./server-stats"
import { Terminal } from "lucide-react"
import { Suspense } from "react"
import { InstallTabsSkeleton } from "./skeleton"
import { fetchData } from "./fetch-data"
import { SecurityOverview } from "./security-overview"

type Props = {
	server: FetchedServer
	initTab?: InstallTabStates
	onTabChange?: (tab: InstallTabStates) => void
}

export async function SidePanel({
	server,
	initTab = "claude",
	onTabChange,
}: Props) {
	// Fetch data from the separate component
	const { apiKey, savedConfig } = await fetchData(server.id)

	return (
		<div>
			<h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
				<Terminal className="h-6 w-6" />
				Installation
			</h2>

			<Suspense fallback={<InstallTabsSkeleton />}>
				<div className="bg-background p-3 rounded-lg border border-border">
					<Installtabs
						// key={`install-tabs-${Date.now()}`}
						server={server}
						initTab={initTab}
						onTabChange={onTabChange}
						apiKey={apiKey}
						savedConfig={savedConfig}
					/>
				</div>
			</Suspense>

			<div className="mt-6">
				<SecurityOverview server={server} />
			</div>

			<ServerStats server={server} serverId={server.qualifiedName} />
		</div>
	)
}
