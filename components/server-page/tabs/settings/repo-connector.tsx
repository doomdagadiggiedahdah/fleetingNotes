"use client"

import { GithubAuthProvider } from "@/components/github/github-user-provider"
import { RepoSelector } from "@/components/github/repo-selector"
import { useToast } from "@/hooks/use-toast"
import { connectServerRepo } from "@/lib/actions/servers"
import type { FetchedServer } from "@/lib/utils/fetch-registry"
import { useRouter } from "next/navigation"

interface Props {
	server: FetchedServer
}

export function RepoConnector({ server }: Props) {
	const toast = useToast()
	const router = useRouter()
	const onConnectRepo = async (repoOwner: string, repoName: string) => {
		try {
			await connectServerRepo(server.id, repoOwner, repoName)
			router.refresh()
		} catch (error) {
			toast.toast({
				title: "Failed to connect server to repo. Please try again.",
			})
		}
	}

	return (
		<>
			<p className="text-sm text-neutral-400">
				Connect this server to a GitHub repository to create deployments.
			</p>
			<GithubAuthProvider>
				<RepoSelector onRepoSelect={onConnectRepo} buttonText="Connect" />
			</GithubAuthProvider>
		</>
	)
}
