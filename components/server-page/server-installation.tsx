import type { FetchedServer } from "@/lib/utils/get-server"
import { InstallationTabs, type InstallTabStates } from "./tabs/install-tabs"

type Props = {
	server: FetchedServer
	initTab?: InstallTabStates
	onTabChange?: (tab: InstallTabStates) => void
}

export function ServerInstallation({
	server,
	initTab = "claude",
	onTabChange,
}: Props) {
	return (
		<div>
			<h2 className="text-2xl font-bold mb-4">Installation</h2>
			<div className="bg-background p-3 rounded-lg border border-border">
				<InstallationTabs
					server={server}
					initTab={initTab}
					onTabChange={onTabChange}
				/>
			</div>
		</div>
	)
}
