import { Globe, Laptop2 } from "lucide-react"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip"

interface ServerStatusChipProps {
	remote: boolean
	isDeployed?: boolean
}

export function ServerStatusChip({
	remote,
	isDeployed,
}: ServerStatusChipProps) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className="flex items-center gap-1 bg-muted/50 rounded-full px-2 py-0.5 text-xs font-medium">
						{remote && isDeployed ? (
							<>
								<Globe className="w-3 h-3 text-blue-500" />
								<span className="text-muted-foreground">Remote</span>
							</>
						) : (
							<>
								<Laptop2 className="w-3 h-3 text-orange-500" />
								<span className="text-muted-foreground">Local</span>
							</>
						)}
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<p>{remote ? "Remote server" : "Local server"}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}
