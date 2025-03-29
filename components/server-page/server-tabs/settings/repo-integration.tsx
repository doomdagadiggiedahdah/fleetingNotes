"use client"

import type { FetchedServer } from "@/lib/utils/get-server"
import type { getConnectedRepos } from "@/lib/actions/servers"
import { RepoConnectionForm } from "./repo-connection-form"
import { RepoConnector } from "./repo-connector"

interface Props {
	server: FetchedServer
	connectedRepos: Awaited<ReturnType<typeof getConnectedRepos>>
}

export function RepoIntegration({ server, connectedRepos }: Props) {
	if (connectedRepos.length > 0) {
		const repo = connectedRepos[0]
		return <RepoConnectionForm serverId={server.id} serverRepo={repo} />
	}

	return <RepoConnector server={server} />
}
