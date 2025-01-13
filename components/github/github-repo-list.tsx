"use client"
import { LockClosedIcon } from "@radix-ui/react-icons"
import { useState } from "react"
import { ButtonLoading } from "../ui/loading-button"

interface GithubRepo {
	name: string
	private: boolean
	updatedAt: string | null
	owner: string
}

interface GithubRepoListProps {
	repos: GithubRepo[]
	isLoading?: boolean
	buttonText?: string
	onRepoSelect: (repoOwner: string, repoName: string) => void
}

export function GithubRepoList({
	repos,
	isLoading: isSearching,
	onRepoSelect,
	buttonText = "Select",
}: GithubRepoListProps) {
	const [isLoading, setIsLoading] = useState(false)

	return (
		<div className="space-y-2">
			{isSearching ? (
				<div className="flex h-32 items-center justify-center">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
				</div>
			) : (
				repos.map((repo) => (
					<div
						key={`${repo.owner}/${repo.name}`}
						className="flex items-center justify-between rounded-md border border-transparent p-1 px-3 transition-colors hover:border-neutral-800 hover:bg-neutral-900"
					>
						<div className="flex items-center gap-3">
							<div className="flex flex-col">
								<span className="text-sm text-white">{repo.name}</span>
							</div>
							{repo.private && (
								<LockClosedIcon className="h-4 w-4 text-neutral-400" />
							)}
						</div>
						<ButtonLoading
							isLoading={isSearching || isLoading}
							onClick={async () => {
								try {
									setIsLoading(true)
									await onRepoSelect(repo.owner, repo.name)
								} finally {
									setIsLoading(false)
								}
							}}
							className="flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
						>
							{buttonText}
						</ButtonLoading>
					</div>
				))
			)}
		</div>
	)
}
