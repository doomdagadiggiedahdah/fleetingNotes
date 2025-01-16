import NewServerForm from "../new-server-form"

interface Props {
	searchParams: Promise<{
		owner: string
		repo: string
	}>
}

export default async function ConfigPage(props: Props) {
    const searchParams = await props.searchParams;
    const owner = searchParams.owner
    const repo = searchParams.repo

    return <NewServerForm owner={owner} repo={repo} />
}
