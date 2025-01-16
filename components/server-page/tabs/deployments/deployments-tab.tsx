import type { FetchedServer } from "@/lib/utils/fetch-registry"
import Link from "next/link"
import { DeploymentsTable } from "./deployments-table"

interface Props {
	server: FetchedServer
}

export function DeploymentsPanel({ server }: Props) {
	return (
		<div>
			<div className="flex justify-between items-center">
				<p className="text-sm">
					<Link
						href="/docs/deployments"
						className="text-sm text-primary hover:underline"
						target="_blank"
						rel="noopener noreferrer"
					>
						Deployments
					</Link>{" "}
					allow you to deploy your standard IO (stdio) server into a hosted
					server-side event (SSE) server.
				</p>
			</div>
			<div className="my-4">
				<DeploymentsTable server={server} />
			</div>
		</div>
	)
}
