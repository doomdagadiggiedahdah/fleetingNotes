"use client"

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog"
import { GithubAuthProvider } from "@/components/github/github-user-provider"
import { RepoSelector } from "@/components/github/repo-selector"
import { updateServerRepo } from "@/lib/actions/servers"
import { useToast } from "@/lib/hooks/use-toast"
import { cn } from "@/lib/utils"

interface Props {
	isOpen: boolean
	onClose: () => void
	serverId: string
	currentRepo: {
		owner: string
		name: string
	}
	onRepoSelect: (owner: string, name: string) => void
}

export function RepoSwitchDialog({
	isOpen,
	onClose,
	serverId,
	currentRepo,
	onRepoSelect,
}: Props) {
	const { toast } = useToast()

	const onSelectNewRepo = async (owner: string, repo: string) => {
		// Optimistically update UI with new repo data
		onRepoSelect(owner, repo)
		onClose()

		try {
			const result = await updateServerRepo(serverId, owner, repo)
			if (result.error) {
				// On error, revert to previous repo
				onRepoSelect(currentRepo.owner, currentRepo.name)
				toast({
					title: "Error",
					description: result.error,
					variant: "destructive",
				})
			} else {
				// Show success toast
				toast({
					title: "Success",
					description: `Switched to ${owner}/${repo}`,
					variant: "default",
					className: cn("bg-secondary", "text-foreground"),
				})
			}
		} catch (error) {
			// On error, revert to previous repo
			onRepoSelect(currentRepo.owner, currentRepo.name)
			toast({
				title: "Error",
				description: "Failed to update repository connection",
				variant: "destructive",
			})
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Switch Repository</DialogTitle>
					<DialogDescription>
						Choose a new repository to deploy from. Your deployment history and
						settings will be preserved. Currently deploying from{" "}
						{currentRepo.owner}/{currentRepo.name}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<GithubAuthProvider>
						<RepoSelector onRepoSelect={onSelectNewRepo} buttonText="Select" />
					</GithubAuthProvider>
				</div>
			</DialogContent>
		</Dialog>
	)
}
