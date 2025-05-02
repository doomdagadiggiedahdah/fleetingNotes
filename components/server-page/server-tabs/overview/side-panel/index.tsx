import type { FetchedServer } from "@/lib/utils/get-server"
import { Terminal } from "lucide-react"
import { Suspense } from "react"
import { ServerStats } from "./server-stats"
import { SecurityOverview } from "./security-overview"
import { ConfigFormLoading } from "@/components/config-form"
import type { fetchData } from "./fetch-data"
import { ConfigWrapper } from "./config-wrapper"

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

	// Extract API key and profiles from fetchResult if available
	const apiKey = fetchResult.type === "success" ? fetchResult.data.apiKey : ""
	const profiles =
		fetchResult.type === "success" ? fetchResult.data.profiles : []

	return (
		<div>
			<h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
				<Terminal className="h-6 w-6" />
				Configuration
			</h2>

			<Suspense fallback={<ConfigFormLoading />}>
				<ConfigWrapper
					key={`config-wrapper-${apiKey}`}
					server={server}
					apiKey={apiKey}
					profiles={profiles}
					configSchema={configSchema}
				/>
			</Suspense>

			<div className="mt-6">
				<SecurityOverview server={server} />
			</div>

			<ServerStats server={server} serverId={server.qualifiedName} />
		</div>
	)
}
