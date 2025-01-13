"use client"
import { UserRepoPicker } from "@/components/github/new-server-auth"
import { useRouter } from "next/navigation"
import ConfigForm from "./form"

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
			<UserRepoPicker
				onRepoSelect={(owner, repo) => {
					router.push(`/new?owner=${owner}&repo=${repo}`)
				}}
				buttonText="Deploy"
			/>
		)
	}

	return <ConfigForm owner={owner} repo={repo} />
}
