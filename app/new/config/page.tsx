import { Header } from "@/components/header"
import { Container } from "@/components/layouts/container"
import ConfigForm from "./form"

interface Props {
	searchParams: {
		owner: string
		repo: string
	}
}

export default function ConfigPage({ searchParams }: Props) {
	const owner = searchParams.owner
	const repo = searchParams.repo

	return (
		<>
			<Header />
			<Container size="md">
				<div className="w-full text-center">
					<h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
						Deploy a New MCP Server
					</h1>
					<p className="mt-3 text-lg text-gray-400">
						Create a project from your Git repository
					</p>
				</div>

				<div className="my-10 w-full">
					<ConfigForm owner={owner} repo={repo} />
				</div>
			</Container>
		</>
	)
}
