"use client"
import type {
	GithubAccount,
	GithubRepository,
	GithubUser,
} from "@/lib/auth/github/client"
import { useState } from "react"
import { GithubRepoList } from "./github-repo-list"
import { GithubSearch } from "./github-search"
import { GithubUserSelector } from "./github-user-selector"

interface RepoSelectorProps {
	ghUser: GithubUser
	onRepoSelect: (owner: string, repo: string) => void
	buttonText?: string
}

export function RepoSelector({
	ghUser,
	onRepoSelect,
	buttonText,
}: RepoSelectorProps) {
	const [repos, setRepos] = useState<GithubRepository[]>([])
	const [selectedOwner, setSelectedOwner] = useState<GithubAccount>(
		ghUser.accounts[0],
	)
	const [searchLoading, setSearchLoading] = useState(false)

	return (
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
	)
}
