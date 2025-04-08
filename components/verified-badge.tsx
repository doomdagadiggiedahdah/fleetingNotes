import * as React from "react"
import { BadgeCheck } from "lucide-react"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./ui/tooltip"

export function VerifiedBadge() {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<BadgeCheck className="w-4 h-4 text-primary" />
				</TooltipTrigger>
				<TooltipContent>
					<p>Official Vendor</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}
