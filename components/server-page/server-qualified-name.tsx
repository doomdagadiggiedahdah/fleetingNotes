import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { FetchedServers } from "@/lib/utils/search-servers"

interface Props {
	server: FetchedServer | FetchedServers[number]
}

export function ServerQualifiedName({ server }: Props) {
	return (
		<div className="text-muted-foreground text-sm my-2 flex items-center gap-2">
			{server.qualifiedName}
			{server.isDeployed && (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger>
							<div className="w-2 h-2 rounded-full bg-green-500" />
						</TooltipTrigger>
						<TooltipContent>
							<p>Hosted on Smithery</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			)}
		</div>
	)
}
