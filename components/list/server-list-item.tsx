import { SERVER_NEW_DAYS as NEW_SERVER_DAYS } from "@/lib/utils"
import type { FetchedServers } from "@/lib/utils/fetch-registry"
import { BadgeCheck, Sparkles } from "lucide-react"
import Link from "next/link"

import { InstallCount } from "../install-count"
import { useRouter } from "next/navigation"

interface ToolCardProps {
	server: FetchedServers[number]
}

export function ServerListItem({ server }: ToolCardProps) {
	const router = useRouter()
	const isNew = (createdAt: Date) => {
		const twoDaysAgo = new Date()
		twoDaysAgo.setDate(twoDaysAgo.getDate() - NEW_SERVER_DAYS)
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
						<div className="flex items-center gap-2">
							<Link
								href={`/server/${server.qualifiedName}`}
								className="text-lg font-semibold text-primary hover:underline flex items-center gap-2"
							>
								{server.homepage && (
									// eslint-disable-next-line @next/next/no-img-element
									<img
										src={`https://api.faviconkit.com/${new URL(server.homepage).hostname}/`}
										onError={(e) => {
											if (server.homepage)
												e.currentTarget.src = `https://icons.duckduckgo.com/ip3/${new URL(server.homepage).hostname}.ico`
										}}
										alt={server.displayName}
										className="w-4 h-4"
									/>
								)}
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
						<InstallCount count={server.installCount} />
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
