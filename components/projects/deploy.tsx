"use client"
import { Button } from "@/components/ui/button"
import { createDeployment } from "@/lib/actions/deployment"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import posthog from "posthog-js"

export function DeployButton({
	projectId: serverId,
	hasPendingBuilding,
}: { projectId: string; hasPendingBuilding: boolean }) {
	const { toast } = useToast()
	const [isLoading, setIsLoading] = useState(false)

	return (
		<Button
			type="submit"
			disabled={isLoading || hasPendingBuilding}
			onClick={async () => {
				try {
					setIsLoading(true)

					posthog.capture("Deploy Clicked", {
						serverId: serverId,
					})

					const { error } = await createDeployment({ serverId })
					if (error) throw new Error(error)
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
	)
}
