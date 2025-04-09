import type { FetchedServer } from "@/lib/utils/get-server"
import { Globe, Activity } from "lucide-react"

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
		<div className="space-y-6 mt-4">
			{/* Stats Grid */}
			<div className="grid grid-cols-2 gap-x-4 gap-y-6">
				{/* Monthly Tool Calls */}
				{server.useCount > 0 && (
					<div>
						<h3 className="text-md font-medium text-muted-foreground mb-1">
							Monthly Tool Calls
						</h3>
						<div className="flex items-center text-sm text-foreground">
							<Activity className="h-3 w-3 mr-1" />
							<span>{server.useCount.toLocaleString()}</span>
						</div>
					</div>
				)}

				{/* License */}
				{server.license && (
					<div>
						<h3 className="text-md font-medium text-muted-foreground mb-1">
							License
						</h3>
						<span className="text-sm text-foreground font-medium">
							{server.license}
						</span>
					</div>
				)}

				{/* Local/Remote */}
				<div>
					<h3 className="text-md font-medium text-muted-foreground mb-1">
						Local
					</h3>
					<span className="flex items-center text-sm text-foreground font-medium">
						{server.remote && server.deploymentUrl ? (
							<>
								<Globe className="w-4 h-4 mr-1" />
								No
							</>
						) : (
							<>Yes</>
						)}
					</span>
				</div>

				{/* Published Date */}
				{server.createdAt && (
					<div>
						<h3 className="text-md font-medium text-muted-foreground mb-1">
							Published
						</h3>
						<span className="text-sm text-foreground font-medium">
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
	)
}
