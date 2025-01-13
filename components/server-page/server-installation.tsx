import type { ServerWithStats } from "@/lib/types/client"
import { InstallationTabs, type InstallTabStates } from "./tabs/install-tabs"

type Props = {
	server: ServerWithStats
	initTab?: InstallTabStates
	onTabChange?: (tab: InstallTabStates) => void
}

export function ServerInstallation({
	server,
	initTab = "claude",
	onTabChange,
}: Props) {
	return (
		<div className="my-8">
			<h2 className="text-2xl font-bold my-4">Installation</h2>
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
