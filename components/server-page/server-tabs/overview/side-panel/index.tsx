import type { FetchedServer } from "@/lib/utils/get-server"
import { Installtabs, type InstallTabStates } from "./install-tabs"
import { ServerStats } from "./server-stats"
import { Terminal } from "lucide-react"
import { Suspense } from "react"
import { InstallTabsSkeleton } from "./skeleton"
import { fetchData } from "./fetch-data"
import { SecurityOverview } from "./security-overview"
import { ApiKeyError } from "./error/api-key-error"
import { LoginError } from "./error/login-error"
import { ProfilesError } from "./error/profiles-error"

type Props = {
	server: FetchedServer
	initTab?: InstallTabStates
	onTabChange?: (tab: InstallTabStates) => void
}

export async function SidePanel({
	server,
	initTab = "auto",
	onTabChange,
}: Props) {
	// Fetch api key and profiles from server side
	const result = await fetchData(server.id)

	// If user is not logged in, show the NotLoggedInError component
	if (result.type === "not_logged_in") {
		return (
			<div>
				<h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
					<Terminal className="h-6 w-6" />
					Installation
				</h2>
				<LoginError />
			</div>
		)
	}

	// If there's an API key error, show the ApiKeyError component
	if (result.type === "api_key_error") {
		return <ApiKeyError message={result.error} />
	}

	// If there's a profiles error, show the ProfilesError component
	if (result.type === "profiles_error") {
		return <ProfilesError message={result.error} />
	}

	// Success - user is logged in and has API key
	const { apiKey, profiles } = result.data

	return (
		<div>
			<h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
				<Terminal className="h-6 w-6" />
				Installation
			</h2>

			<Suspense fallback={<InstallTabsSkeleton />}>
				<div className="bg-background p-3 rounded-lg border border-border">
					<Installtabs
						server={server}
						initTab={initTab}
						onTabChange={onTabChange}
						apiKey={apiKey}
						profiles={profiles} // contains n profiles / user and one | null saved config per profile for the given server
					/>
				</div>
			</Suspense>

			<div className="mt-6">
				<SecurityOverview server={server} />
			</div>

			<ServerStats server={server} serverId={server.qualifiedName} />
		</div>
	)
}
