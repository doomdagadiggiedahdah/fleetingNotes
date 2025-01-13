import type { FetchedServer } from "@/lib/utils/fetch-registry"
import { DeploymentsTable } from "./deployments-table"

interface Props {
	server: FetchedServer
}

export function DeploymentsPanel({ server }: Props) {
	return (
		<div>
			<p className="text-sm">
				Deployments allow you to deploy your standard IO (stdio) server into an
				hosted server-side event (SSE) server. This makes it easy for clients to
				consume your MCP. This feature is currently in preview.
			</p>
			<div className="my-4">
				<DeploymentsTable server={server} />
			</div>
		</div>
	)
}
