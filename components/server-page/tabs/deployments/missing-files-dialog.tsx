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
import { checkGithubPermissions } from "@/lib/actions/check-github-permissions"
import { createConfigPr, hasOpenConfigPr } from "@/lib/actions/config-pr"
import type { DeploymentMissingFiles } from "@/lib/actions/deployment"
import { AlertCircle, GitPullRequest } from "lucide-react"
import { useEffect, useState } from "react"

interface MissingFilesDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	serverId: string
	missingFiles: DeploymentMissingFiles | null
}

export function MissingFilesDialog({
	open,
	onOpenChange,
	serverId,
	missingFiles,
}: MissingFilesDialogProps) {
	const [isChecking, setIsChecking] = useState(false)
	const [permissionError, setPermissionError] = useState<string | null>(null)

	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [prUrl, setPrUrl] = useState<string | null>(null)

	useEffect(() => {
		if (open) {
			setIsChecking(true)
			;(async () => {
				const [permResult, openPrResult] = await Promise.all([
					checkGithubPermissions({ serverId }),
					hasOpenConfigPr(serverId),
				])

				if (!permResult.ok) {
					setPermissionError(permResult.error)
				} else {
					setPermissionError(null)
				}
				if (openPrResult.ok) {
					setPrUrl(openPrResult.value.prUrl)
				}

				setIsChecking(false)
			})()
		}
	}, [open, serverId])

	const handleCreatePR = async () => {
		setIsLoading(true)
		setError(null)
		setPrUrl(null)
		try {
			const result = await createConfigPr(serverId)
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
		if (missingFiles.smitheryFile) files.push("Smithery.yaml")
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
						{permissionError ? (
							<div className="space-y-4">
								<Alert variant="destructive">
									<AlertCircle className="h-4 w-4" />
									<div className="ml-2">
										<p className="font-medium">
											Insufficient GitHub Permissions
										</p>
										<p className="text-sm">{permissionError}</p>
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
											disabled={!!permissionError || isLoading}
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
