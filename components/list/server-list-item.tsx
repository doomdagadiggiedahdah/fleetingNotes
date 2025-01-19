import { SERVER_NEW_DAYS } from "@/lib/utils"
import type { FetchedServers } from "@/lib/utils/fetch-registry"
import { BadgeCheck, Sparkles } from "lucide-react"
import Link from "next/link"

import { InstallCount } from "../install-count"
import { useRouter } from "next/navigation"
import { ServerFavicon } from "../server-page/server-favicon"

interface ToolCardProps {
	server: FetchedServers[number]
}

export function ServerListItem({ server }: ToolCardProps) {
	const router = useRouter()
	const isNew = (createdAt: Date) => {
		const twoDaysAgo = new Date()
		twoDaysAgo.setDate(twoDaysAgo.getDate() - SERVER_NEW_DAYS)
		return new Date(createdAt) >= twoDaysAgo
	}

	return (
		<div
			role="listitem"
			className="bg-card rounded-lg border border-border p-4 hover:bg-accent transition-colors h-full flex flex-col"
			onClick={(evt) => {
				evt.preventDefault()
				router.push(`/server/${server.qualifiedName}`)
			}}
		>
			<div className="flex-1">
				<div className="cursor-pointer">
					<div className="flex items-baseline justify-between mb-1">
						<div className="flex items-center gap-2 min-w-0 flex-1">
							<Link
								href={`/server/${server.qualifiedName}`}
								className="text-lg font-semibold text-primary hover:underline flex items-center gap-2 min-w-0 truncate"
							>
								<ServerFavicon
									homepage={server.homepage}
									displayName={server.displayName}
								/>
								{server.displayName}
							</Link>
							{server.verified && (
								<BadgeCheck className="w-4 h-4 text-primary " />
							)}
							{server.createdAt && isNew(server.createdAt) && (
								<div className="flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
									<Sparkles className="w-3 h-3" />
									New
								</div>
							)}
						</div>
						<div className="flex-shrink-0 ml-4">
							<InstallCount count={server.installCount} />
						</div>
					</div>
					<div className="text-muted-foreground text-sm my-2">
						{server.qualifiedName}
					</div>
					<p className="text-card-foreground mb-3 text-sm line-clamp-3">
						{server.description}
					</p>
				</div>
			</div>
		</div>
	)
}
