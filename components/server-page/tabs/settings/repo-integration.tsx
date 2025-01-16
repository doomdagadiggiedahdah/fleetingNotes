import type { FetchedServer } from "@/lib/utils/fetch-registry"
import { getConnectedRepos } from "@/lib/actions/servers"
import { RepoConnectionForm } from "./repo-connection-form"
import { RepoConnector } from "./repo-connector"

interface Props {
	server: FetchedServer
}

export async function RepoIntegration({ server }: Props) {
	const connectedRepos = await getConnectedRepos(server.id)

	if (connectedRepos.length > 0) {
		const repo = connectedRepos[0]
		return <RepoConnectionForm serverId={server.id} serverRepo={repo} />
	}

	return <RepoConnector server={server} />
}
