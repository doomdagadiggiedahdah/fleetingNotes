import { HelpCircle } from "lucide-react"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export function ProfileInfoChip() {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<HelpCircle className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer" />
				</TooltipTrigger>
				<TooltipContent className={cn("bg-primary/80 backdrop-blur-sm")}>
					<p>
						Profiles let you create different personas for your agent.
						<br />
						Your server configuration is saved to the specific profile you
						choose.
						<br />
					</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}
