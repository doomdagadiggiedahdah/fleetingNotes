import ConfigForm from "../form"

interface Props {
	searchParams: {
		owner: string
		repo: string
	}
}

export default function ConfigPage({ searchParams }: Props) {
	const owner = searchParams.owner
	const repo = searchParams.repo

	return <ConfigForm owner={owner} repo={repo} />
}
