"use client"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
	createDeployment,
	type DeploymentMissingFiles,
} from "@/lib/actions/deployment"
import posthog from "posthog-js"
import { useState } from "react"
import { MissingFilesDialog } from "./missing-files-dialog"

export function DeployButton({
	serverId,
	hasPendingBuilding,
}: { serverId: string; hasPendingBuilding: boolean }) {
	const { toast } = useToast()
	const [isLoading, setIsLoading] = useState(false)
	const [missingFiles, setMissingFiles] =
		useState<DeploymentMissingFiles | null>(null)

	return (
		<>
			<Button
				type="submit"
				disabled={isLoading || hasPendingBuilding}
				onClick={async () => {
					try {
						setIsLoading(true)

						posthog.capture("Deploy Clicked", {
							serverId: serverId,
						})

						const { error, missing } = await createDeployment({ serverId })
						if (error && missing) {
							setMissingFiles(missing)
							return
						}
						toast({
							title: "Deployment started",
							description: "This might take a minute...",
						})
					} catch (error) {
						toast({
							title: "Failed to create deployment",
							description:
								error instanceof Error
									? error.message
									: "An unexpected error occurred",
						})
					} finally {
						setIsLoading(false)
					}
				}}
			>
				{isLoading && (
					<div className="h-4 w-4 mr-1 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
				)}
				Deploy
			</Button>
			<MissingFilesDialog
				open={!!missingFiles}
				onOpenChange={() => setMissingFiles(null)}
				serverId={serverId}
				missingFiles={missingFiles}
			/>
		</>
	)
}
