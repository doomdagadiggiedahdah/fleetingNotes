import { Shield, AlertTriangle } from "lucide-react"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip"

interface SecurityStatusChipProps {
	isSecure?: boolean
}

export function SecurityStatusChip({ isSecure }: SecurityStatusChipProps) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className="flex items-center gap-1 bg-muted/50 rounded-full px-2 py-0.5 text-xs font-medium">
						{isSecure === undefined ? (
							<>
								<Shield className="w-3 h-3 text-gray-500" />
								<span className="text-muted-foreground">Not Scanned</span>
							</>
						) : isSecure ? (
							<>
								<Shield className="w-3 h-3 text-gray-100" />
								<span className="text-muted-foreground">Scanned</span>
							</>
						) : (
							<>
								<AlertTriangle className="w-3 h-3 text-red-500" />
								<span className="text-muted-foreground">Insecure</span>
							</>
						)}
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<p>
						{isSecure === undefined
							? "Security not yet scanned"
							: isSecure
								? "Tool prompts are secure"
								: "Server has security issues"}
					</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}
