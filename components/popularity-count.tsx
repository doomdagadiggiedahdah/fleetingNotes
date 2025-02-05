import { Activity } from "lucide-react"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./ui/tooltip"

interface Props {
	count?: number
}

function formatCount(num: number): string {
	if (num >= 1_000_000) {
		return `${(Math.floor(num / 10000) / 100).toFixed(2)}m`
	} else if (num >= 1000) {
		return `${(Math.floor(num / 10) / 100).toFixed(2)}k`
	}
	return num.toString()
}

export function PopularityCounter({ count = 0 }: Props) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger>
					<div className="flex items-center gap-1 text-sm text-muted-foreground">
						<Activity className="h-3 w-3" />
						<span>{formatCount(count)}</span>
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<p>Used {formatCount(count)} times last month</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}
