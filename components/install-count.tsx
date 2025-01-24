"use client"

import { ArrowLeftRight, Download } from "lucide-react"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./ui/tooltip"

interface Props {
	count?: number
	type: "install" | "tool_calls"
}

function formatCount(num: number): string {
	if (num >= 1_000_000) {
		return `${(Math.floor(num / 10000) / 100).toFixed(2)}m`
	} else if (num >= 1000) {
		return `${(Math.floor(num / 10) / 100).toFixed(2)}k`
	}
	return num.toString()
}

export function PopularityCounter({ count = 0, type }: Props) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger>
					<div className="flex items-center gap-1 text-sm text-muted-foreground">
						{type === "install" ? (
							<Download className="h-4 w-4" />
						) : (
							<ArrowLeftRight className="h-4 w-4" />
						)}
						<span>{formatCount(count)}</span>
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<p>
						{type === "install"
							? `${count.toLocaleString()}  installs`
							: `Used ${count.toLocaleString()} times`}
					</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}
