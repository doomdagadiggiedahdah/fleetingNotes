import { UserRepoPicker } from "@/components/github/new-server-auth"
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
		return <UserRepoPicker />
	}

	return <ConfigForm owner={owner} repo={repo} />
}
