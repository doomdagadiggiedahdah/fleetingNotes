import type { FetchedServer } from "@/lib/utils/get-server"
import { ServerInstallation } from "../server-installation"
import { ServerStats } from "../server-stats"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ReadingPanelProps {
	server: FetchedServer
}

export function AboutPanel({ server }: ReadingPanelProps) {
	return (
		<div>
			<div className="grid grid-cols-1 md:grid-cols-12 gap-4">
				<div className="md:col-span-7">
					<p>{server.description}</p>
					{server.descriptionLongMdx && (
						<div className="my-8">{server.descriptionLongMdx}</div>
					)}
				</div>

				{/* Side Panel */}
				<div className="md:col-span-5">
					<ServerInstallation server={server} />
					<ServerStats server={server} serverId={server.qualifiedName} />
				</div>
			</div>
		</div>
	)
}
