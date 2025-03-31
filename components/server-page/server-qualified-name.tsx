"use client"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { FetchedServers } from "@/lib/utils/search-servers"
import { useState } from "react"

interface Props {
	server: FetchedServer | FetchedServers[number]
	copyable?: boolean
}

export function ServerQualifiedName({ server, copyable = false }: Props) {
	const [copied, setCopied] = useState(false)

	const copyToClipboard = () => {
		navigator.clipboard
			.writeText(server.qualifiedName)
			.then(() => {
				// Set copied state to true to show feedback
				setCopied(true)
				// Reset after 2 seconds
				setTimeout(() => setCopied(false), 2000)
			})
			.catch((err) => {
				console.error("Failed to copy: ", err)
			})
	}

	return (
		<div className="text-muted-foreground text-sm my-2 flex items-center gap-2">
			<TooltipProvider>
				<Tooltip open={copied}>
					<TooltipTrigger asChild>
						<button
							onClick={copyable ? copyToClipboard : undefined}
							className="hover:text-foreground transition-colors cursor-pointer overflow-hidden text-ellipsis"
							type="button"
						>
							{server.qualifiedName}
						</button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Copied to clipboard!</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</div>
	)
}
