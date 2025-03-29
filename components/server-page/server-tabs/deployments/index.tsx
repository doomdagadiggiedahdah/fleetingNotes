import type { FetchedServer } from "@/lib/utils/get-server"
import Link from "next/link"
import { DeploymentsTable } from "./deployments-table"

interface Props {
	server: FetchedServer
}

export function DeploymentsTab({ server }: Props) {
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
					server. Hosted servers will list their tools in the Tool tab and have
					installation information in the About tab. Deployments are in early
					preview. If you run into any issues or have feedback, let us know on{" "}
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
				{/* Force remount component till a better fix is found - SMI 215 */}
				<DeploymentsTable key={Date.now()} server={server} />
			</div>
		</div>
	)
}
