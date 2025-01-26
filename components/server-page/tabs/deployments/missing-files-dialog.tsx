"use client"

import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { ButtonLoading } from "@/components/ui/loading-button"
import { Skeleton } from "@/components/ui/skeleton"
import {
	checkDeployment,
	type DeploymentMissingFiles,
} from "@/lib/actions/deployment"
import {
	createConfigPullRequest,
	hasOpenConfigPullRequest,
} from "@/lib/actions/generate-pr"
import { AlertCircle, GitPullRequest } from "lucide-react"
import { useEffect, useState } from "react"

interface MissingFilesDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	serverId: string
	checkOnLoad: boolean
}

export function MissingFilesDialog({
	open,
	onOpenChange,
	serverId,
	checkOnLoad,
}: MissingFilesDialogProps) {
	const [isChecking, setIsChecking] = useState(false)

	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [prUrl, setPrUrl] = useState<string | null>(null)

	const [missingFiles, setMissingFiles] =
		useState<DeploymentMissingFiles | null>(null)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)

	useEffect(() => {
		if (open || checkOnLoad) {
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
					} else if (checkResult.error.missingFiles) {
						setMissingFiles(checkResult.error.missingFiles)
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

	const handleCreatePR = async () => {
		setIsLoading(true)
		setError(null)
		setPrUrl(null)
		try {
			const result = await createConfigPullRequest(serverId)
			if (!result.ok) {
				setError(`Failed to create pull request: ${result.error}`)
				return
			}
			if (result.value.prUrl) setPrUrl(result.value.prUrl)
		} catch (error) {
			console.error("Failed to create pull request:", error)
			setError("An unexpected error occurred. Please try again.")
		} finally {
			setIsLoading(false)
		}
	}

	const getMissingFilesList = () => {
		if (!missingFiles) return []
		const files = []
		if (missingFiles.dockerfile) files.push("Dockerfile")
		if (missingFiles.smitheryFile) files.push("smithery.yaml")
		return files
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<AlertCircle className="h-5 w-5 text-yellow-500" />
						Missing Configuration Files
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
						{errorMessage ? (
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
									for your connected repository and try again.
								</p>
							</div>
						) : (
							<>
								<div className="space-y-4">
									<p className="text-sm text-muted-foreground">
										Your repository is missing the following required files:
									</p>
									<ul className="text-sm text-muted-foreground list-disc list-inside my-2">
										{getMissingFilesList().map((file) => (
											<li key={file}>{file}</li>
										))}
									</ul>
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
													Once merged, you may redeploy this server.
												</p>
											</div>
										</Alert>
									) : (
										<p className="text-sm text-muted-foreground">
											We can help you set these up automatically.
										</p>
									)}
								</div>

								{error && (
									<Alert variant="destructive" className="mb-2">
										{error}
									</Alert>
								)}
								<div className="flex justify-end gap-2">
									<Button variant="outline" onClick={() => onOpenChange(false)}>
										{prUrl ? "Close" : "Cancel"}
									</Button>
									{!prUrl && (
										<ButtonLoading
											onClick={handleCreatePR}
											isLoading={isLoading}
											disabled={!!errorMessage || isLoading}
										>
											Generate Pull Request
										</ButtonLoading>
									)}
								</div>
							</>
						)}
					</>
				)}
			</DialogContent>
		</Dialog>
	)
}
