import type { FetchedServer } from "@/lib/utils/get-server"
import { ExternalLink, Github } from "lucide-react"
import { Suspense } from "react"
import { VerifiedBadge } from "../verified-badge"
import { Container } from "../layouts/container"
import { ClaimButton } from "./claim/claim-button"
import { ServerFavicon } from "./server-favicon"
import { ServerQualifiedName } from "./server-qualified-name"
import { ServerTabs } from "./server-tabs"
import ServerSearch from "../homepage/server-search"
import { ServerStatusChip } from "../server-type-chip"
import { SecurityStatusChip } from "../security-status-chip"
// import { CopyButton } from "@/components/ui/copy-button"
import { fetchData } from "./server-tabs/overview/side-panel/fetch-data"
import { InstallButton } from "./install-button"

interface Props {
	server: FetchedServer
	activeTab: string
}

export async function ServerPage({ server, activeTab }: Props) {
	// const serverUrl = server.deploymentUrl || undefined
	// const baseUrl = serverUrl ? createSmitheryUrl(serverUrl).toString() : ""

	// Fetch API key server-side
	const result = await fetchData(server.id)

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
						<div className="flex flex-col gap-2">
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
								{server.verified && <VerifiedBadge />}
							</div>
							{/* <ServerUrlDisplay
								url={baseUrl}
								apiKey={result.type === "success" ? result.data.apiKey : null}
								configSchema={server.configSchema || null}
								serverId={server.id}
								profiles={
									result.type === "success" ? result.data.profiles : undefined
								}
							/> */}
						</div>
						<div className="flex items-center gap-2">
							<Suspense>
								<InstallButton
									key={`install-${result.type === "success" ? result.data.apiKey : null}`}
									server={server}
									apiKey={result.type === "success" ? result.data.apiKey : null}
									profiles={
										result.type === "success" ? result.data.profiles : undefined
									}
								/>
								<ClaimButton server={server} />
							</Suspense>
						</div>
					</div>
					<div className="flex items-center gap-4 text-sm text-muted-foreground">
						<ServerQualifiedName server={server} copyable={true} />
						{server.sourceUrl && !server.serverRepo.isPrivate && (
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
					<div className="flex items-center gap-2">
						<ServerStatusChip
							remote={server.remote}
							isDeployed={server.deploymentUrl !== null}
						/>
						{server.securityScan && (
							<SecurityStatusChip isSecure={server.securityScan.isSecure} />
						)}
					</div>
				</div>

				<ServerTabs
					server={server}
					activeTab={activeTab}
					fetchResult={result}
				/>
			</Container>
		</>
	)
}
