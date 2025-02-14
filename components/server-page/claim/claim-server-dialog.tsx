"use client"

import { GithubAuthProvider } from "@/components/github/github-user-provider"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { ButtonLoading } from "@/components/ui/loading-button"
import { assignUnclaimedServers } from "@/lib/actions/claim-servers"
import { openGithubAppInstall } from "@/lib/auth/github/client"
import { Check, Loader2, XCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface ClaimServerDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	serverId: string
}

export function ClaimServerDialog({
	open,
	onOpenChange,
	serverId,
}: ClaimServerDialogProps) {
	const router = useRouter()
	const [claimResult, setClaimResult] = useState<{
		error?: string
		claimedCount?: number
	}>({})
	const [showInstall, setShowInstall] = useState(false)
	const [isLoading, setIsLoading] = useState(false)

	const handleRepoClaim = async () => {
		setIsLoading(true)
		try {
			const result = await assignUnclaimedServers()
			if (result.error) {
				setClaimResult({ error: result.error })
				setShowInstall(false)
			} else {
				setClaimResult({ claimedCount: result.claimedCount })
				router.refresh()
			}
		} catch (error) {
			setClaimResult({ error: "An unexpected error occurred" })
		} finally {
			setIsLoading(false)
		}
	}

	const handleReset = () => {
		setShowInstall(false)
		setClaimResult({})
		setIsLoading(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="text-center mb-4">Claim Server</DialogTitle>
				</DialogHeader>
				<p className="text-sm text-muted-foreground">
					Claiming a server allows you to edit its settings and deploy Smithery
					hosted servers.{" "}
					<Link
						href="/docs/git"
						className="underline hover:opacity-80 text-primary"
						target="_blank"
					>
						Read more
					</Link>{" "}
					about the permissions we require.
				</p>
				{/* Step 1: GitHub Installation */}
				<div className="space-y-6">
					<div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
						<div className="flex-1">
							<h3 className="font-medium">1. Install GitHub App</h3>
						</div>
						<div className="flex items-center gap-2">
							<GithubAuthProvider>
								{showInstall ? (
									<Check className="w-5 h-5 text-green-500" />
								) : (
									<Button
										onClick={() => {
											openGithubAppInstall()
											setShowInstall(true)
										}}
									>
										Install App
									</Button>
								)}
							</GithubAuthProvider>
						</div>
					</div>

					{/* Step 2: Claim Ownership */}
					<div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
						<div className="flex-1">
							<h3 className="font-medium">2. Claim Ownership</h3>
							<p className="text-sm text-muted-foreground">
								{claimResult.claimedCount !== undefined &&
									(isLoading
										? "Processing your claim..."
										: claimResult.error
											? "Failed to claim server"
											: `Claimed ${claimResult.claimedCount} server${
													claimResult.claimedCount !== 1 ? "s" : ""
												}. Refresh the page to see the changes.`)}
							</p>
						</div>
						<div className="flex items-center gap-2">
							{!showInstall ? null : isLoading ? (
								<Loader2 className="w-5 h-5 animate-spin" />
							) : claimResult.error ? (
								<>
									<XCircle className="w-5 h-5 text-red-500" />
									<Button variant="outline" size="sm" onClick={handleReset}>
										Try Again
									</Button>
								</>
							) : claimResult.claimedCount !== undefined ? (
								<Check className="w-5 h-5 text-green-500" />
							) : (
								<ButtonLoading onClick={handleRepoClaim} isLoading={isLoading}>
									Claim
								</ButtonLoading>
							)}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
