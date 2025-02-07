"use cache"
import { getAllServers } from "@/lib/utils/search-servers"
import { ServerListItem } from "./server-list-item"

export default async function ServerList({ query }: { query?: string }) {
	const { servers } = await getAllServers(query)

	return (
		<div className="space-y-4 mt-4">
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{servers.map((server) => (
					<ServerListItem key={server.qualifiedName} server={server} />
				))}
			</div>
			{servers.length === 0 && (
				<div className="bg-card rounded-lg border border-border p-4 text-center text-card-foreground">
					No servers found.
				</div>
			)}
		</div>
	)
}
