"use client"

import { Download } from "lucide-react"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./ui/tooltip"

interface InstallCountProps {
	count?: number
}

export function InstallCount({ count = 0 }: InstallCountProps) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger>
					<div className="flex items-center gap-1 text-sm text-muted-foreground">
						<Download className="h-4 w-4" />
						<span>{count}</span>
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<p>{count} installs</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}
