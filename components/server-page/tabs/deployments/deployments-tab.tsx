import type { FetchedServer } from "@/lib/utils/fetch-registry"
import { DeploymentsTable } from "./deployments-table"

interface Props {
	server: FetchedServer
}

export function DeploymentsPanel({ server }: Props) {
	return (
		<div>
			<p className="text-sm ">
				Deployments allow you to deploy your standard IO (stdio) server into an
				hosted server-side event (SSE) server. This makes it easy for clients to
				consume your MCP. If you deploy your server, Smithery will install the
				hosted edition for end-users.
			</p>
			<p className="text-sm text-muted-foreground my-2">
				This feature is currently in preview. Please report bugs to our Discord!
			</p>
			<div className="my-4">
				<DeploymentsTable server={server} />
			</div>
		</div>
	)
}
