import { getDeployments } from "@/lib/actions/deployment"
import type { FetchedServer } from "@/lib/utils/fetch-registry"
import { Suspense } from "react"
import { DeploymentsTableClient } from "./deployments-table-client"

interface Props {
	server: FetchedServer
}

async function DeploymentsTableContent({ server }: Props) {
	const deployments = await getDeployments(server.id)

	return (
		<DeploymentsTableClient server={server} initialDeployments={deployments} />
	)
}

export function DeploymentsTable(props: Props) {
	return (
		<Suspense fallback={<div>Loading deployments...</div>}>
			{/* @ts-expect-error Async Server Component */}
			<DeploymentsTableContent {...props} />
		</Suspense>
	)
}
