import { UserRepoList } from "@/components/github/user-repo-list"
import ConfigForm from "./form"

interface Props {
	searchParams: {
		owner?: string
		repo?: string
	}
}

export default function NewPage({ searchParams }: Props) {
	const owner = searchParams.owner
	const repo = searchParams.repo

	if (!owner || !repo) {
		return <UserRepoList />
	}

	return <ConfigForm owner={owner} repo={repo} />
}
