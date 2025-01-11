"use client"
import { Button } from "@/components/ui/button"
import { createDeployment } from "@/lib/actions/deployment"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"

export function DeployButton({ projectId }: { projectId: string }) {
	const { toast } = useToast()
	const [isLoading, setIsLoading] = useState(false)

	return (
		<Button
			type="submit"
			disabled={isLoading}
			onClick={async () => {
				try {
					setIsLoading(true)
					await createDeployment({ projectId })
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
