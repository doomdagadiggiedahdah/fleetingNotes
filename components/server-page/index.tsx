import type { FetchedServer } from "@/lib/utils/get-server"
import { BadgeCheck, ExternalLink, Github } from "lucide-react"
import { Suspense } from "react"
import { Container } from "../layouts/container"
import { ClaimButton } from "./claim/claim-button"
import { ServerFavicon } from "./server-favicon"
import { ServerQualifiedName } from "./server-qualified-name"
import { ServerTabs } from "./server-tabs"
import ServerSearch from "../server-search"
import { ServerStatusChip } from "../server-type-chip"

interface Props {
	server: FetchedServer
	activeTab: string
}

export async function ServerPage({ server, activeTab }: Props) {
	return (
		<>
			<Container className="mt-4">
				{/* Search */}
				<div className="mb-6">
					<Suspense>
						<ServerSearch />
					</Suspense>
				</div>

				{/* Server Header */}
				<div className="mb-6">
					<div className="flex items-baseline justify-between">
						<div className="flex items-center gap-2">
							<h1 className="text-2xl font-bold flex items-center gap-2">
								<ServerFavicon
									homepage={server.homepage}
									displayName={server.displayName}
									iconUrl={server.iconUrl}
									className="w-6 h-6"
								/>
								{server.displayName}
							</h1>
							{server.verified && (
								<BadgeCheck className="w-4 h-4 text-primary" />
							)}
							<ServerStatusChip
								remote={server.remote}
								isDeployed={server.deploymentUrl !== null}
							/>
						</div>
						<Suspense>
							<ClaimButton server={server} />
						</Suspense>
					</div>
					<div className="flex items-center gap-4 text-sm text-muted-foreground">
						<ServerQualifiedName server={server} copyable={true} />
						{server.sourceUrl && (
							<a
								href={server.sourceUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center hover:text-primary"
								title={`${server.serverRepo.owner}/${server.serverRepo.repo}`}
							>
								<Github className="w-4 h-4" />
							</a>
						)}
						{server.homepage && (
							<a
								href={server.homepage}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center hover:text-primary"
								title="Homepage"
							>
								<ExternalLink className="w-4 h-4" />
							</a>
						)}
					</div>
				</div>

				<ServerTabs server={server} activeTab={activeTab} />
			</Container>
		</>
	)
}
