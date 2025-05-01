import type { FetchedServers } from "@/lib/actions/search-servers"
import { Sparkles } from "lucide-react"
import Link from "next/link"

import { PopularityCounter } from "../popularity-count"
import { VerifiedBadge } from "../verified-badge"
import { ServerFavicon } from "../server-page/server-favicon"
import { ServerQualifiedName } from "../server-page/server-qualified-name"
import posthog from "posthog-js"
import { ServerStatusChip } from "../server-type-chip"

interface ToolCardProps {
	server: FetchedServers[number]
}

export function ServerListItem({ server }: ToolCardProps) {
	return (
		<Link
			href={`/server/${server.qualifiedName}`}
			onClick={() => {
				posthog.capture("Server List Item Clicked", {
					id: server.id,
					qualifiedName: server.qualifiedName,
				})
			}}
			role="listitem"
			className="bg-card rounded-lg border border-border p-4 hover:bg-accent transition-colors h-full flex flex-col"
		>
			<div className="flex-1">
				<div className="cursor-pointer">
					<div className="flex items-baseline mb-1">
						<div className="flex items-center gap-2 min-w-0 flex-1">
							<h3 className="text-lg font-semibold text-primary hover:underline flex items-center gap-2 min-w-0 truncate">
								<ServerFavicon
									homepage={server.homepage}
									displayName={server.displayName}
									iconUrl={server.iconUrl}
									className="w-6 h-6 flex-shrink-0"
								/>
								<span className="truncate">{server.displayName}</span>
							</h3>
							{server.verified && <VerifiedBadge />}
							{server.isNew && (
								<div className="flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
									<Sparkles className="w-3 h-3" />
									New
								</div>
							)}
						</div>
					</div>
					<div className="min-w-0 -mt-1 mb-1">
						<ServerQualifiedName server={server} />
					</div>
					<p className="text-card-foreground text-sm line-clamp-3">
						{server.description}
					</p>
				</div>
			</div>
			<div className="mt-auto pt-3 flex items-center justify-between">
				<ServerStatusChip
					remote={server.remote}
					isDeployed={server.isDeployed}
				/>
				{server.useCount > 0 && <PopularityCounter count={server.useCount} />}
			</div>
		</Link>
	)
}
