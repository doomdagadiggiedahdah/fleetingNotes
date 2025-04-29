import { ServerItem } from "./server-item"
import { ServerConfigForm } from "./server-config-form"
import { useState } from "react"
// import type { ProfileServer } from "."
import { AddServerForm } from "./add-server-form"
import { useRouter } from "next/navigation"
import type { ProfileServers, Server } from "@/lib/types/profiles"

export function ServerList({
	profileServers,
	onSelect,
	profileId,
}: {
	profileServers: ProfileServers
	onSelect: (server: Server) => void
	profileId: string
}) {
	const [configServer, setConfigServer] = useState<Server | null>(null)
	const router = useRouter()
	const { servers } = profileServers

	if (configServer) {
		// Create a new object with only the selected server
		const profileServer = {
			...profileServers,
			servers: [configServer] as [Server],
		}
		return (
			<ServerConfigForm
				profileServers={profileServer}
				onBack={() => setConfigServer(null)}
			/>
		)
	}

	return (
		<>
			<AddServerForm
				profileId={profileId}
				onAdd={() => {
					// Refresh the data without reloading the page
					router.refresh()
				}}
			/>
			{servers.length === 0 ? (
				<div className="text-muted-foreground mt-6 text-center">
					Add servers to view them here
				</div>
			) : (
				<>
					<h3 className="text-sm font-medium mt-6 mb-4">Your Servers</h3>
					{servers.map((server, i) => (
						<ServerItem
							key={server.id}
							server={server}
							index={i}
							onSelect={() => onSelect(server)}
							onEdit={() => setConfigServer(server)}
							onDelete={() => {
								/* handle delete */
							}}
							profileId={profileId}
						/>
					))}
				</>
			)}
		</>
	)
}
