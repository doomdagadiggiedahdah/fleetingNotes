import { MCPProvider } from "@/context/mcp-context"
import type { FetchedServer } from "@/lib/utils/fetch-registry"
import { BadgeCheck, ExternalLink } from "lucide-react"

import { SiGithub } from "@icons-pack/react-simple-icons"
import { Suspense } from "react"
import { Header } from "../header"
import { Container } from "../layouts/container"
import { ClaimButton } from "./claim/claim-button"
import { ServerFavicon } from "./server-favicon"
import { ServerQualifiedName } from "./server-qualified-name"
import ServerSearch from "./server-search"
import { ServerTabs } from "./tabs"

interface Props {
	server: FetchedServer
	tab?: string
}

export function ServerPage({ server }: Props) {
	return (
		<>
			<Header />
			<Container className="mt-4">
				{/* Search */}
				<div className="mb-6">
					<ServerSearch />
				</div>

				{/* Server Header */}
				<div className="mb-6">
					<div className="flex items-baseline justify-between mb-2">
						<div className="flex items-center gap-2">
							<h1 className="text-2xl font-bold flex items-center gap-2">
								{server.homepage && (
									<ServerFavicon
										homepage={server.homepage}
										displayName={server.displayName}
									/>
								)}
								{server.displayName}
							</h1>
							{server.verified && (
								<BadgeCheck className="w-4 h-4 text-primary" />
							)}
						</div>
						<Suspense>
							<ClaimButton server={server} />
						</Suspense>
					</div>
					<div className="flex items-center gap-4 text-sm text-muted-foreground">
						<ServerQualifiedName server={server} />
						{server.sourceUrl && (
							<a
								href={server.sourceUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center hover:text-primary"
							>
								<SiGithub className="w-4 h-4 mr-1" />
								{server.serverRepo.owner}/{server.serverRepo.repo}
							</a>
						)}
						{server.homepage && (
							<a
								href={server.homepage}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center hover:text-primary"
							>
								<ExternalLink className="w-4 h-4 mr-1" />
								Homepage
							</a>
						)}
					</div>
				</div>

				<MCPProvider>
					<Suspense>
						<ServerTabs server={server} />
					</Suspense>
				</MCPProvider>
			</Container>
		</>
	)
}
