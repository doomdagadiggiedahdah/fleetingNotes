import type { FetchedServer } from "@/lib/utils/get-server"
import { Globe, Activity, GitBranch, GitCommit } from "lucide-react"

interface ServerStatsProps {
	serverId: string
	server: FetchedServer
}

export function ServerStats({ server }: ServerStatsProps) {
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

				{/* Source Code */}
				{server.sourceUrl &&
				!server.serverRepo.isPrivate &&
				server.serverRepo.branch ? (
					<div>
						<h3 className="text-md font-medium text-muted-foreground mb-1">
							Deployed from
						</h3>
						<div className="flex items-center gap-2 text-sm text-foreground">
							<a
								href={`${server.sourceUrl.replace(/\/tree\/main\/.*$/, "")}/tree/${server.serverRepo.branch}`}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center hover:underline"
							>
								<GitBranch className="h-3.5 w-3.5 mr-1" />
								<span>{server.serverRepo.branch}</span>
							</a>
							{server.serverRepo.commit && (
								<a
									href={`${server.sourceUrl.replace(/\/tree\/main\/.*$/, "")}/commit/${server.serverRepo.commit}`}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center hover:underline"
								>
									<GitCommit className="h-3.5 w-3.5 mr-1" />
									<span>{server.serverRepo.commit.substring(0, 7)}</span>
								</a>
							)}
						</div>
					</div>
				) : null}

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
