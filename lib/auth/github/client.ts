"use client"
import { supabase } from "@/lib/supabase/client"
import { Octokit } from "@octokit/rest"
import type { GithubAccount, GithubRepository, GithubUser } from "./common"

const GITHUB_APP_NAME = process.env.NEXT_PUBLIC_GITHUB_APP_NAME!

export async function getOctokit() {
	const {
		data: { session },
	} = await supabase.auth.getSession()
	if (!session?.provider_token) return null

	return {
		user: session.user,
		octokit: new Octokit({
			auth: session.provider_token,
		}),
	}
}

export async function getGithubUser(): Promise<GithubUser | null> {
	try {
		const res = await getOctokit()
		if (!res) return null
		const { octokit, user } = res

		const installResp = await octokit.request("GET /user/installations")

		return {
			// TODO: Possible for no accounts?
			accounts: installResp.data.installations
				.map((install) => install.account)
				// TODO: Somehow Github returns Org but type doesn't allow it
				.filter((acc) => acc !== null) as unknown as GithubAccount[],
		}
	} catch (error) {
		console.error("Failed to fetch GitHub user:", error)
		return null
	}
}

export async function getRecentGithubRepositories(
	octokit: Octokit,
	account: GithubAccount,
): Promise<GithubRepository[]> {
	try {
		const { data: repos } =
			account.type === "Organization"
				? await octokit.repos.listForOrg({
					org: account.login,
					sort: "updated",
					direction: "desc",
					per_page: 5,
				})
				: await octokit.repos.listForUser({
					username: account.login,
					sort: "updated",
					direction: "desc",
					per_page: 5,
				})

		return repos.map((repo) => ({
			name: repo.name,
			private: repo.private,
			updatedAt: repo.updated_at ?? null,
			owner: repo.owner?.login || account.login,
		}))
	} catch (error) {
		console.error("Failed to fetch repositories:", error)
		return []
	}
}

export function getGithubAppInstallUrl(state?: string) {
	const params = new URLSearchParams()
	if (state) params.set("state", state)
	return `https://github.com/apps/${GITHUB_APP_NAME}/installations/new?${params.toString()}`
}

export function openGithubAppInstall() {
	const state = Math.random().toString(36).substring(7)
	const url = getGithubAppInstallUrl(state)
	const width = 1020
	const height = 618
	const left = window.screenX + (window.outerWidth - width) / 2
	const top = window.screenY + (window.outerHeight - height) / 2

	window.open(
		url,
		"Install GitHub App",
		`width=${width},height=${height},left=${left},top=${top},popup=1`,
	)
}
