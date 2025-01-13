"use client"
import {
	getOctokit,
	getRecentGithubRepositories,
	type GithubAccount,
	type GithubUser,
} from "@/lib/auth/github/client"
import { useEffect, useState } from "react"

interface GithubSearchProps {
	ghUser: GithubUser
	selectedAccount: GithubAccount
	onReposChange: (
		repos: Array<{
			name: string
			private: boolean
			updatedAt: string | null
			owner: string
		}>,
	) => void
	onLoadingChange: (isLoading: boolean) => void
}

export function GithubSearch({
	ghUser,
	selectedAccount,
	onReposChange,
	onLoadingChange,
}: GithubSearchProps) {
	const [searchQuery, setSearchQuery] = useState("")

	useEffect(() => {
		let isCurrentSearch = true

		const fetchRecentRepositories = async () => {
			if (!selectedAccount || !ghUser) return

			try {
				const res = await getOctokit()
				if (!res) return null
				const { octokit } = res

				const repos = await getRecentGithubRepositories(
					octokit,
					selectedAccount,
				)
				if (isCurrentSearch) {
					onReposChange(repos)
				}
			} catch (error) {
				console.error("Failed to fetch recent repos:", error)
			}
		}

		const searchRepos = async () => {
			onLoadingChange(true)

			if (!searchQuery.trim()) {
				await fetchRecentRepositories()
				if (isCurrentSearch) {
					onLoadingChange(false)
				}
				return
			}

			try {
				const res = await getOctokit()
				if (!res) return null
				const { octokit } = res

				const { data } = await octokit.search.repos({
					q: `${searchQuery.trim()} in:name fork:true ${
						selectedAccount.type === "Organization"
							? `org:${selectedAccount.login}`
							: `user:${selectedAccount.login}`
					}`,
					per_page: 5,
					sort: "updated",
				})

				if (isCurrentSearch) {
					onReposChange(
						data.items.map((repo) => ({
							name: repo.name,
							private: repo.private,
							updatedAt: repo.updated_at,
							owner: repo.owner!.login,
						})),
					)
				}
			} catch (error) {
				console.error("Failed to search repos:", error)
			} finally {
				if (isCurrentSearch) {
					onLoadingChange(false)
				}
			}
		}

		const debounceTimeout = setTimeout(searchRepos, 300)

		return () => {
			isCurrentSearch = false
			clearTimeout(debounceTimeout)
		}
	}, [searchQuery, selectedAccount, ghUser, onReposChange, onLoadingChange])

	return (
		<div className="relative">
			<input
				type="text"
				placeholder="Search repositories..."
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
				className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-white placeholder-neutral-400 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
			/>
		</div>
	)
}
