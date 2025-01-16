import NewServerForm from "../new-server-form"

interface Props {
	searchParams: {
		owner: string
		repo: string
	}
}

export default function ConfigPage({ searchParams }: Props) {
	const owner = searchParams.owner
	const repo = searchParams.repo

	return <NewServerForm owner={owner} repo={repo} />
}
