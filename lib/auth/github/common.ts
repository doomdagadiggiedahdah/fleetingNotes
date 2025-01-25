import type { components } from "@octokit/openapi-types"

export interface GithubRepository {
	name: string
	private: boolean
	updatedAt: string | null
	owner: string
}

export type GithubAccount =
	| components["schemas"]["simple-user"]
	| components["schemas"]["organization"]
// TODO: Support enterprise?

export interface GithubUser {
	accounts: GithubAccount[]
}

export interface GithubInstallation {
	id: number
	account: {
		login: string
		type: "User" | "Organization"
	}
}
