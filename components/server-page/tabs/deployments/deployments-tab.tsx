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
				<p className="text-sm text-muted-foreground">
					<Link
						href="/docs/deployments"
						className="text-sm text-primary hover:underline"
						target="_blank"
						rel="noopener noreferrer"
					>
						Deployments
					</Link>{" "}
					allow you to deploy your standard IO (stdio) server into a hosted
					server-side event (SSE) server. Deployments are in early preview. If
					you run into any issues or have feedback, let us know on{" "}
					<a
						href="https://discord.gg/Afd38S5p9A"
						className="text-sm text-primary hover:underline"
						target="_blank"
						rel="noopener noreferrer"
					>
						Discord
					</a>
					.
				</p>
			</div>
			<div className="my-4">
				<DeploymentsTable server={server} />
			</div>
		</div>
	)
}
