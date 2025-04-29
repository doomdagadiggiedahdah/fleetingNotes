import { Settings, Trash, ExternalLink, ChevronDown } from "lucide-react"
import { ServerFavicon } from "@/components/server-page/server-favicon"
import type { Server } from "@/lib/types/profiles"
import Link from "next/link"
import { useState } from "react"
import { removeServerFromProfile } from "@/lib/actions/profiles"

interface ServerItemProps {
	server: Server
	index: number
	onSelect: () => void
	onEdit?: () => void
	onDelete?: () => void
	profileId: string
}

export function ServerItem({
	server,
	index,
	onEdit,
	onDelete,
	profileId,
}: ServerItemProps) {
	const [isExpanded, setIsExpanded] = useState(false)

	const handleDelete = async (e: React.MouseEvent) => {
		e.stopPropagation()
		if (
			confirm(
				`Are you sure you want to remove ${server.displayName} from this profile?`,
			)
		) {
			const result = await removeServerFromProfile(profileId, server.id)
			if (result.ok) {
				onDelete?.()
			}
		}
	}

	return (
		<li
			className={`py-1 flex flex-col text-foreground px-2 rounded-md ${index % 2 === 0 ? "bg-accent/10" : ""}`}
		>
			<button
				className="flex items-center gap-3 cursor-pointer w-full text-left"
				onClick={() => setIsExpanded(!isExpanded)}
			>
				<div className="flex-shrink-0">
					<ServerFavicon
						homepage={server.homepage ?? null}
						displayName={server.displayName}
						iconUrl={server.iconUrl ?? undefined}
						className="h-7 w-7 rounded-sm"
					/>
				</div>
				<span className="flex-grow">{server.displayName}</span>
				<ChevronDown
					className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
				/>
			</button>

			{isExpanded && (
				<div className="mt-2 pl-10 pr-2 pb-2 space-y-3">
					<p className="text-sm text-muted-foreground">{server.description}</p>

					<div className="flex items-center justify-between pt-2 border-t border-border">
						<div className="flex gap-2">
							<button
								className="flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-accent/30 transition"
								onClick={(e) => {
									e.stopPropagation()
									onEdit?.()
								}}
							>
								<Settings className="w-4 h-4" />
								<span>Configure</span>
							</button>
							<Link
								href={`/server/${server.qualifiedName}`}
								className="flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-accent/30 transition"
								onClick={(e) => e.stopPropagation()}
								target="_blank"
								rel="noopener noreferrer"
							>
								<ExternalLink className="w-4 h-4" />
								<span>View Details</span>
							</Link>
						</div>
						<button
							className="flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-destructive/20 transition text-destructive"
							onClick={handleDelete}
						>
							<Trash className="w-4 h-4" />
							<span>Remove Server</span>
						</button>
					</div>
				</div>
			)}
		</li>
	)
}
