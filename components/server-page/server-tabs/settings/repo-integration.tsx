"use client"

import type { FetchedServer } from "@/lib/utils/get-server"
import { getConnectedRepos } from "@/lib/actions/servers"
import { RepoConnectionForm } from "./repo-connection-form"
import { RepoConnector } from "./repo-connector"
import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface Props {
	server: FetchedServer
}

export function RepoIntegration({ server }: Props) {
	const [isLoading, setIsLoading] = useState(true)
	const [connectedRepos, setConnectedRepos] = useState<
		Awaited<ReturnType<typeof getConnectedRepos>>
	>([])

	useEffect(() => {
		async function fetchRepos() {
			try {
				const repos = await getConnectedRepos(server.id)
				setConnectedRepos(repos)
			} finally {
				setIsLoading(false)
			}
		}
		fetchRepos()
	}, [server.id])

	if (isLoading) {
		return <Skeleton className="h-[200px] w-full" />
	}

	if (connectedRepos.length > 0) {
		const repo = connectedRepos[0]
		return <RepoConnectionForm serverId={server.id} serverRepo={repo} />
	}

	return <RepoConnector server={server} />
}
