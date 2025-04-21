/**
 * Types for GitHub webhook payloads and API responses
 */

export interface Repository {
	id: number
	full_name: string
	name: string
	owner: {
		login: string
		id: number
	}
}

export interface RepositoryRenamedPayload {
	action: "renamed"
	repository: Repository
	changes: {
		repository: {
			name: {
				from: string
			}
		}
	}
}

export interface RepositoryTransferredPayload {
	action: "transferred"
	repository: Repository
	changes: {
		owner: {
			from: {
				organization: object
				user: object | null
			}
		}
	}
}

export interface RepoChangeInfo {
	oldOwner?: string
	newOwner?: string
	oldRepoName?: string
	newRepoName?: string
}

export interface PushPayload {
	after: string
	base_ref: string | null
	before: string
	commits: Array<{
		added: string[]
		author: {
			date: string
			name: string
			email: string
			username?: string
		}
		committer: {
			date: string
			name: string
			email: string
			username?: string
		}
		distinct: boolean
		id: string
		message: string
		modified: string[]
		removed: string[]
		timestamp: string
		url: string
	}>
	compare: string
	created: boolean
	deleted: boolean
	enterprise?: object
	forced: boolean
	head_commit: object | null
	installation?: object
	organization?: object
	pusher: {
		name: string
		email: string
	}
	ref: string
	repository: Repository
	sender?: object
}

export type GitHubWebhookPayload =
	| RepositoryRenamedPayload
	| RepositoryTransferredPayload
	| PushPayload
