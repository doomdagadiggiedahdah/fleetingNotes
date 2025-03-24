import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export function InstallWarning() {
	return (
		<Alert
			variant="default"
			className={cn(
				"border-0 text-base text-muted-foreground bg-muted/50",
				"p-4 space-y-2",
			)}
		>
			<AlertTriangle className="h-6 w-6 text-yellow-500" />
			<AlertDescription>
				The author hasn&apos;t published this server yet. Once published, it
				will be available for installation.
			</AlertDescription>
		</Alert>
	)
}
