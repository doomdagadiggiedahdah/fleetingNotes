"use client"

import type { FetchedServer } from "@/lib/utils/fetch-registry"
import { ServerInstallation } from "../server-installation"
import { ServerStats } from "../server-stats"

interface ReadingPanelProps {
	server: FetchedServer
}

export function AboutPanel({ server }: ReadingPanelProps) {
	return (
		<div className="my-8">
			<div className="grid grid-cols-1 md:grid-cols-12 gap-2">
				<div className="md:col-span-7">{server.description}</div>

				{/* Side Panel */}
				<div className="md:col-span-5">
					<ServerInstallation server={server} />
					<ServerStats server={server} serverId={server.qualifiedName} />
				</div>
			</div>
		</div>
	)
}
