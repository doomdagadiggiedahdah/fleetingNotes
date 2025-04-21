/**
 * Types for GitHub webhook payloads and API responses
 */

export interface GithubWebhookRepositoryPayload {
  action: "renamed" | "transferred" | string
  repository: {
    name: string
    owner: {
      login: string
    }
  }
  changes?: {
    repository?: {
      name?: {
        from: string
      }
    }
    owner?: {
      from: {
        login: string
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