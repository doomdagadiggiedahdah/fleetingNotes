import { RepoIntegration } from "./repo-integration"
import { DangerZone } from "./danger-zone"
import { ServerGeneralSettings } from "./server-general-settings"
import { BadgeContent } from "./badge-content"
import type { FetchedServer } from "@/lib/utils/get-server"
import { getConnectedRepos } from "@/lib/actions/servers"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface SettingsPanelProps {
	server: FetchedServer
}

export function SettingsTab({ server }: SettingsPanelProps) {
	return (
		<div className="my-8 max-w-2xl space-y-12">
			<ServerGeneralSettings server={server} />

			<div>
				<h3 className="text-lg font-medium mb-4">GitHub Integration</h3>
				<div className="space-y-4">
					<Suspense fallback={<Skeleton className="h-[200px] w-full" />}>
						<RepoIntegrationWrapper server={server} />
					</Suspense>
				</div>
			</div>

			<BadgeContent server={server} />

			<DangerZone server={server} />
		</div>
	)
}

async function RepoIntegrationWrapper({ server }: { server: FetchedServer }) {
	const connectedRepos = await getConnectedRepos(server.id)
	return <RepoIntegration server={server} connectedRepos={connectedRepos} />
}
