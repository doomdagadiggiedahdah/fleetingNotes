"use client"
import { useRouter } from "next/navigation"
import ConfigForm from "./form"
import { GithubAuthProvider } from "@/components/github/github-user-provider"
import { RepoSelector } from "@/components/github/repo-selector"

interface Props {
	searchParams: {
		owner?: string
		repo?: string
	}
}

export default function NewPage({ searchParams }: Props) {
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
					buttonText="Deploy"
				/>
			</GithubAuthProvider>
		)
	}

	return <ConfigForm owner={owner} repo={repo} />
}
