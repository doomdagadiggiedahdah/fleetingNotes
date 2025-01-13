import type { FetchedServer } from "@/lib/utils/fetch-registry"
import { RepoConnector } from "./repo-connector"
import { getConnectedRepos } from "@/lib/actions/servers"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
	server: FetchedServer
}

export async function RepoIntegration({ server }: Props) {
	const connectedRepos = await getConnectedRepos(server.id)

	if (connectedRepos.length > 0) {
		const repo = connectedRepos[0]
		return (
			<>
				<Card>
					<CardContent className="space-y-2 pt-4">
						<p className="text-sm text-neutral-400">
							This server is connected to {repo.repoOwner}/{repo.repoName}.
						</p>
					</CardContent>
				</Card>
			</>
		)
	}

	return (
		<>
			<RepoConnector server={server} />
		</>
	)
}
