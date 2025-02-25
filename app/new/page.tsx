"use client"
import { use } from "react"
import { useRouter } from "next/navigation"
import NewServerForm from "./new-server-form"
import { GithubAuthProvider } from "@/components/github/github-user-provider"
import { RepoSelector } from "@/components/github/repo-selector"

// Bounded by create deployment
export const maxDuration = 800

interface Props {
	searchParams: Promise<{
		owner?: string
		repo?: string
	}>
}

export default function NewPage(props: Props) {
	const searchParams = use(props.searchParams)
	const router = useRouter()
	const owner = searchParams.owner
	const repo = searchParams.repo

	if (!owner || !repo) {
		return (
			<GithubAuthProvider>
				<RepoSelector
					onRepoSelect={(owner, repo) => {
						router.push(`/new?owner=${owner}&repo=${repo}`)
					}}
					buttonText="Create"
				/>
			</GithubAuthProvider>
		)
	}

	return <NewServerForm owner={owner} repo={repo} />
}
