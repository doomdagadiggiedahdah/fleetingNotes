import type { FetchedServer } from "@/lib/utils/get-server"
import { Card } from "@/components/ui/card"
import { Shield, Wrench } from "lucide-react"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import Link from "next/link"
import { ServerFavicon } from "@/components/server-page/server-favicon"

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
		<div className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1.5">
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
								className="ml-2 border-l border-muted-foreground/20 pl-2"
							>
								<ServerFavicon
									homepage="https://invariantlabs.ai"
									displayName="Invariant Labs"
									className="w-4 h-4 my-auto mt-0.5"
									iconUrl="/favicons/invariant.ico"
								/>
							</Link>
						</TooltipTrigger>
						<TooltipContent>
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
		<Card className="p-4 space-y-4">
			<div className="flex items-center gap-2">
				<Shield className="h-4 w-4" />
				<h3 className="text-sm font-medium">Security</h3>
			</div>

			<div className="space-y-2">
				<SecurityChip
					icon={<Wrench className="w-3.5 h-3.5" />}
					label="Tool Prompts"
					value={securityStatus.status}
					tooltip="Security status of tool prompts"
					showBranding={securityStatus.showBranding}
				/>
			</div>
		</Card>
	)
}
