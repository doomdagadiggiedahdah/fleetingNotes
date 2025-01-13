import { useState } from "react"
import {
	SiAnthropic,
	SiTypescript,
	SiGithub,
} from "@icons-pack/react-simple-icons"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
	ClientInstallContent,
	BadgeContent,
	TypeScriptContent,
} from "./install-tab-content"
import type { FetchedServer } from "@/lib/utils/fetch-registry"

export type InstallTabStates = "claude" | "cline" | "code" | "badge"

type InstallationTabsProps = {
	server: FetchedServer
	initTab?: InstallTabStates
	className?: string
	onTabChange?: (tab: InstallTabStates) => void
}

export function InstallationTabs({
	server,
	initTab = "claude",
	className,
	onTabChange,
}: InstallationTabsProps) {
	const [activeTab, setActiveTab] = useState<InstallTabStates>(initTab)

	return (
		<Tabs
			value={activeTab}
			className={className}
			onValueChange={(tab) => {
				setActiveTab(tab as InstallTabStates)
				onTabChange?.(tab as InstallTabStates)
			}}
		>
			<TabsList className="border-b border-border mb-3">
				<TabsTrigger value="claude">
					<span className="flex items-center gap-2">
						<SiAnthropic className="w-4 h-4" />
						Claude
					</span>
				</TabsTrigger>
				<TabsTrigger value="cline">Cline</TabsTrigger>
				<TabsTrigger value="code">
					<span className="flex items-center gap-2">
						<SiTypescript className="w-4 h-4" />
						Typescript
					</span>
				</TabsTrigger>
				<TabsTrigger value="badge">
					<span className="flex items-center gap-2">
						<SiGithub className="w-4 h-4" />
						Badge
					</span>
				</TabsTrigger>
			</TabsList>
			<TabsContent value="claude">
				<ClientInstallContent tool={server} client="claude" />
			</TabsContent>
			<TabsContent value="cline">
				<ClientInstallContent tool={server} client="cline" />
			</TabsContent>
			<TabsContent value="code">
				<TypeScriptContent tool={server} />
			</TabsContent>
			<TabsContent value="badge">
				<BadgeContent tool={server} />
			</TabsContent>
		</Tabs>
	)
}
