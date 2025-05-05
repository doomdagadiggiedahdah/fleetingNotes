import type { FetchedServer } from "@/lib/utils/get-server"
import { Shield, Info } from "lucide-react"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import Link from "next/link"
import { ServerFavicon } from "@/components/server-page/server-favicon"
import { cn } from "@/lib/utils"

interface SecurityOverviewProps {
	server: FetchedServer
}

function SecurityChip({
	icon,
	label,
	value,
	tooltip,
	showBranding = true,
}: {
	icon: React.ReactNode
	label: string
	value: string
	tooltip?: string
	showBranding?: boolean
}) {
	const content = (
		<div className="flex items-center gap-1.5 bg-muted/50 rounded-full px-2 py-1 w-fit">
			{icon}
			<span className="text-muted-foreground text-sm">{label}</span>
			<span className="font-medium text-sm">{value}</span>
			{showBranding && (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Link
								href="https://invariantlabs.ai"
								target="_blank"
								rel="noopener noreferrer"
								className="ml-1.5 border-l border-muted-foreground/20 pl-1.5 flex items-center gap-1"
							>
								<ServerFavicon
									homepage="https://invariantlabs.ai"
									displayName="Invariant Labs"
									className="w-3.5 h-3.5 my-auto mt-0.5"
									iconUrl="/favicons/invariant.ico"
								/>
								<span className="text-xs text-muted-foreground pr-1">
									Invariant
								</span>
							</Link>
						</TooltipTrigger>
						<TooltipContent
							className={cn("bg-primary/20 backdrop-blur-sm border-primary/20")}
						>
							<p>Powered by Invariant Guardrails</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			)}
		</div>
	)

	if (tooltip) {
		return (
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>{content}</TooltipTrigger>
					<TooltipContent>
						<p>{tooltip}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		)
	}

	return content
}

export function SecurityOverview({ server }: SecurityOverviewProps) {
	const securityStatus = {
		status: (server.securityScan?.isSecure === undefined
			? "not scanned"
			: server.securityScan?.isSecure
				? "secure"
				: "insecure") as "not scanned" | "secure" | "insecure",
		showBranding: server.securityScan?.isSecure !== undefined,
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<div className="flex items-center gap-1.5 text-muted-foreground">
					<Shield className="h-4 w-4" />
					<span className="text-md font-medium">Security</span>
				</div>
				<SecurityChip
					icon={null}
					label=""
					value={securityStatus.status}
					showBranding={securityStatus.showBranding}
				/>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Info className="h-3.5 w-3.5 text-muted-foreground" />
						</TooltipTrigger>
						<TooltipContent className="max-w-[300px] bg-primary/20 backdrop-blur-md border-primary/20">
							<p>
								This scan checks for potential security vulnerabilities
								including:
							</p>
							<ul className="list-disc list-inside mt-1">
								<li>Tool Poisoning</li>
								<li>MCP rug pulls</li>
								<li>Cross-origin escalations</li>
								<li>Prompt Injection Attacks</li>
							</ul>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
			{/* <div className="h-px bg-border" /> */}
		</div>
	)
}
