import type { FetchedServer } from "@/lib/utils/fetch-registry"

interface ServerStatsProps {
	serverId: string
	server: FetchedServer
}

interface TabButtonProps {
	isActive: boolean
	onClick: (e: React.MouseEvent) => void
	icon?: React.ReactNode
	children: React.ReactNode
}

const TabButton = ({ isActive, onClick, icon, children }: TabButtonProps) => {
	return (
		<button
			className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${
				isActive ? "border-b-2 border-primary" : ""
			}`}
			onClick={onClick}
		>
			{icon}
			{children}
		</button>
	)
}

export function ServerStats({ serverId, server }: ServerStatsProps) {
	return (
		<div className="space-y-4 mt-6">
			<div className="p-4 space-y-4">
				<h2 className="font-semibold">Server Statistics</h2>

				<div className="space-y-2">
					{server.useCount ? (
						<div className="flex justify-between">
							<span className="text-muted-foreground">Usage</span>
							<span className="font-medium">
								Called {server.useCount} times
							</span>
						</div>
					) : null}
					{server.license && (
						<div className="flex justify-between">
							<span className="text-muted-foreground">License</span>
							<span className="font-medium">{server.license}</span>
						</div>
					)}
					{server.createdAt && (
						<div className="flex justify-between">
							<span className="text-muted-foreground">Published</span>
							<span className="font-medium">
								{server.createdAt.toLocaleDateString("en-US", {
									year: "numeric",
									month: "numeric",
									day: "numeric",
								})}
							</span>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
