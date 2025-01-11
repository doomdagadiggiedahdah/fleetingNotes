import { NewProject } from "@/components/new-project"
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
		return <NewProject />
	}

	return <ConfigForm owner={owner} repo={repo} />
}
