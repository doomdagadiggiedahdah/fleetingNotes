import type { FetchedServer } from "@/lib/utils/get-server"
import { Suspense } from "react"
import { ServerStats } from "./server-stats"
import { SecurityOverview } from "./security-overview"
import { ConfigFormLoading } from "@/components/config-form"
import type { fetchData } from "./fetch-data"
import { ConfigWrapper } from "./config-wrapper"
import { Info } from "lucide-react"

type Props = {
	server: FetchedServer
	fetchResult: Awaited<ReturnType<typeof fetchData>>
}

export async function SidePanel({ server, fetchResult }: Props) {
	// Get schema directly from server
	const configSchema = server.deploymentUrl
		? server.configSchema
		: server.connections.find((conn) => conn.type === "stdio")?.configSchema ||
			null

	if (!configSchema) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 py-6 text-muted-foreground">
				<div className="text-center">
					<h3 className="text-xl font-semibold mb-2">
						Configuration Unavailable
					</h3>
					<p>This server does not have a configuration schema available.</p>
				</div>
			</div>
		)
	}

	return (
		<div>
			<Suspense fallback={<ConfigFormLoading />}>
				<ConfigWrapper
					key={`config-wrapper-${fetchResult.type === "success" ? fetchResult.data.apiKey : "no-key"}`}
					server={server}
					fetchResult={fetchResult}
					configSchema={configSchema}
				/>
			</Suspense>

			<h1 className="text-xl font-semibold mb-4 mt-6 flex items-center gap-2">
				<Info className="h-5 w-5" />
				Details
			</h1>
			<div className="border rounded-lg p-4">
				<SecurityOverview server={server} />
				<ServerStats server={server} serverId={server.qualifiedName} />
			</div>
		</div>
	)
}
