"use client"
import type { GithubAccount, GithubRepository } from "@/lib/auth/github/common"
import { useContext, useState } from "react"
import { GithubRepoList } from "./github-repo-list"
import { GithubSearch } from "./github-search"
import { GithubUserContext } from "./github-user-provider"
import { GithubUserSelector } from "./github-user-selector"

interface RepoSelectorProps {
	onRepoSelect: (owner: string, repo: string) => void
	buttonText?: string
}

export function RepoSelector({ onRepoSelect, buttonText }: RepoSelectorProps) {
	const ghUser = useContext(GithubUserContext)
	if (!ghUser) throw new Error("Github context not setup")
	const [repos, setRepos] = useState<GithubRepository[]>([])
	const [selectedOwner, setSelectedOwner] = useState<GithubAccount | null>(
		ghUser.accounts[0],
	)
	const [searchLoading, setSearchLoading] = useState(false)

	return (
		<div className="space-y-4">
			<div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
				<div className="flex justify-between items-center gap-4 p-3">
					<GithubUserSelector
						user={ghUser}
						selectedAccount={selectedOwner}
						onOwnerChange={setSelectedOwner}
					/>
					<div className="flex-grow">
						<GithubSearch
							ghUser={ghUser}
							selectedAccount={selectedOwner}
							onReposChange={setRepos}
							onLoadingChange={setSearchLoading}
						/>
					</div>
				</div>
				<GithubRepoList
					repos={repos}
					isLoading={searchLoading}
					onRepoSelect={onRepoSelect}
					buttonText={buttonText}
				/>
			</div>
			<p className="text-sm text-muted-foreground max-w-md">
				We ask for write permission on your repository to create automated
				pull-requests for faster setup. These pull requests are created on
				dedicated `smithery/*` branches.
			</p>
		</div>
	)
}
