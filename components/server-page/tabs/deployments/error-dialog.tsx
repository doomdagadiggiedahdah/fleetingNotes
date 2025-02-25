"use client"

import { Alert } from "@/components/ui/alert"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { checkDeployment } from "@/lib/actions/deployment"
import { hasOpenConfigPullRequest } from "@/lib/actions/generate-pr"
import { AlertCircle, GitPullRequest } from "lucide-react"
import { useEffect, useState } from "react"

interface Props {
	open: boolean
	onOpenChange: (open: boolean) => void
	serverId: string
	checkOnLoad: boolean
}

export function ErrorDialog({
	open,
	onOpenChange,
	serverId,
	checkOnLoad,
}: Props) {
	const [isChecking, setIsChecking] = useState(false)
	const [prUrl, setPrUrl] = useState<string | null>(null)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)

	useEffect(() => {
		if (open || checkOnLoad) {
			// Performs checks to see if this server is deployable
			setIsChecking(true)
			;(async () => {
				const [checkResult, openPrResult] = await Promise.all([
					checkDeployment(serverId),
					hasOpenConfigPullRequest(serverId),
				])

				if (!checkResult.ok) {
					if ("message" in checkResult.error) {
						setErrorMessage(checkResult.error.message)
						onOpenChange(true)
					} else if (checkResult.error.missingPermissions) {
						setErrorMessage(checkResult.error.missingPermissions)
						onOpenChange(true)
					} else if (checkResult.error.missingInstallation) {
						setErrorMessage("Smithery Github App not installed.")
						onOpenChange(true)
					}
				}

				if (openPrResult.ok && openPrResult.value.pr) {
					setPrUrl(openPrResult.value.pr.prUrl)
				}

				setIsChecking(false)
			})()
		}
	}, [open || checkOnLoad, serverId])

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<AlertCircle className="h-5 w-5 text-yellow-500" />
						Action Required
					</DialogTitle>
				</DialogHeader>
				{isChecking ? (
					<div className="space-y-4">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-10 w-full" />
					</div>
				) : (
					<>
						{errorMessage && (
							<div className="space-y-4">
								<Alert variant="destructive">
									<AlertCircle className="h-4 w-4" />
									<div className="ml-2">
										<p className="font-medium">Permissions Error</p>
										<p className="text-sm">{errorMessage}</p>
									</div>
								</Alert>
								<p className="text-sm text-muted-foreground">
									Please{" "}
									<a
										href={`https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_NAME}/installations/new`}
										target="_blank"
										rel="noopener noreferrer"
										className="font-medium text-primary hover:underline"
									>
										update the GitHub App permissions
									</a>{" "}
									to ensure Smithery is installed for your repository and try
									again.
								</p>
							</div>
						)}

						{prUrl ? (
							<Alert variant="default">
								<GitPullRequest className="h-4 w-4" />
								<div className="ml-2">
									<p className="text-sm">
										Review your generated pull request:{" "}
										<a
											href={prUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="font-medium text-primary hover:underline"
										>
											{prUrl}
										</a>
									</p>
									<p className="text-sm">
										Once merged, you may deploy this server.
									</p>
								</div>
							</Alert>
						) : null}
					</>
				)}
			</DialogContent>
		</Dialog>
	)
}
