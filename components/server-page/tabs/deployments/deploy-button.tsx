"use client"
import { Button } from "@/components/ui/button"
import { useToast } from "@/lib/hooks/use-toast"
import { createDeployment } from "@/lib/actions/deployment"
import posthog from "posthog-js"
import { useEffect, useState } from "react"
import type { Deployment } from "./deployments-table"
import { ErrorDialog } from "./error-dialog"

interface Props {
	serverId: string
	hasPendingBuilding: boolean
	deployments: Deployment[] | null
}
export function DeployButton({
	serverId,
	hasPendingBuilding,
	deployments,
}: Props) {
	const { toast } = useToast()
	const [isLoading, setIsLoading] = useState(true)
	const [openModal, setOpenModal] = useState(false)
	const [checkOnLoad, setCheckOnLoad] = useState(false)

	useEffect(() => {
		if (deployments !== null) {
			// Deployments loaded

			// Trigger a check to see if we have any errors or PRs.
			setCheckOnLoad(true)
			setIsLoading(false)
		}
	}, [deployments])

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

						const result = await createDeployment(serverId)

						if (result.ok) {
							toast({
								title: "Deployment started",
							})
						} else {
							toast({
								title: "Error starting deployment",
							})
							setOpenModal(true)
						}
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
			<ErrorDialog
				open={openModal}
				onOpenChange={(open) => setOpenModal(open)}
				serverId={serverId}
				checkOnLoad={checkOnLoad}
			/>
		</>
	)
}
