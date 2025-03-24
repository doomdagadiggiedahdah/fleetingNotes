import type { FetchedServer } from "@/lib/utils/get-server"
import { Installtabs, type InstallTabStates } from "./install-tabs"
import { ServerStats } from "./server-stats"
import { Terminal } from "lucide-react"

type Props = {
	server: FetchedServer
	initTab?: InstallTabStates
	onTabChange?: (tab: InstallTabStates) => void
}

export function SidePanel({ server, initTab = "claude", onTabChange }: Props) {
	return (
		<div>
			<h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
				<Terminal className="h-6 w-6" />
				Installation
			</h2>
			<div className="bg-background p-3 rounded-lg border border-border">
				<Installtabs
					key={`install-tabs-${Date.now()}`} // Intentional for forced mount, do not remove
					server={server}
					initTab={initTab}
					onTabChange={onTabChange}
				/>
			</div>

			<ServerStats server={server} serverId={server.qualifiedName} />
		</div>
	)
}
