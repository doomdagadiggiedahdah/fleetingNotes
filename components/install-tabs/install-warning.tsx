import { CloudOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import React from "react"

type InstallWarningProps = {
	message?: string
	onContinue?: () => void
}

export function InstallWarning({ message, onContinue }: InstallWarningProps) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 py-6 text-muted-foreground">
			<CloudOff className="h-8 w-8" />
			<div className="text-center">
				<h3 className="text-xl font-semibold mb-2">Uh oh!</h3>
				<p className="whitespace-pre-line">
					{message ||
						"The author hasn't published this server yet. Once published, it will be available for installation."}
				</p>
				{onContinue && (
					<Button
						variant="default"
						size="sm"
						onClick={onContinue}
						className="mt-4 text-sm"
					>
						Continue Anyway
					</Button>
				)}
			</div>
		</div>
	)
}
