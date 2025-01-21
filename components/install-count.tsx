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

function formatCount(num: number): string {
	if (num >= 1_000_000) {
		return `${(Math.floor(num / 10000) / 100).toFixed(2)}m`
	} else if (num >= 1000) {
		return `${(Math.floor(num / 10) / 100).toFixed(2)}k`
	}
	return num.toString()
}

export function InstallCount({ count = 0 }: InstallCountProps) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger>
					<div className="flex items-center gap-1 text-sm text-muted-foreground">
						<Download className="h-4 w-4" />
						<span>{formatCount(count)}</span>
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<p>{count.toLocaleString()} installs</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}
