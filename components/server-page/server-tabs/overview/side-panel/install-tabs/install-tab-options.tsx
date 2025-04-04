"use client"

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SiAnthropic } from "@icons-pack/react-simple-icons"
import { VscVscode } from "react-icons/vsc"
import { ServerFavicon } from "../../../../server-favicon"
import { OverflowMenu } from "./overflow-menu"
import type { ClientType } from "@/lib/utils/generate-command"

type TabOption = {
	value: ClientType
	label: string
	icon: React.ReactNode
}

interface InstallTabOptionsProps {
	activeTab: ClientType
	tabOrder: ClientType[]
	visibleCount: number
	onTabChange: (tab: ClientType) => void
	onOverflowSelect: (tab: ClientType) => void
}

export function InstallTabOptions({
	activeTab,
	tabOrder,
	visibleCount,
	onTabChange,
	onOverflowSelect,
}: InstallTabOptionsProps) {
	// Client configuration data
	const clientsConfig: Record<
		ClientType,
		{ label: string; homepage?: string }
	> = {
		claude: { label: "Claude" },
		cursor: { label: "Cursor", homepage: "https://cursor.sh" },
		windsurf: { label: "Windsurf", homepage: "https://codeium.com" },
		cline: { label: "Cline", homepage: "http://cline.bot" },
		witsy: { label: "Witsy", homepage: "https://witsyai.com" },
		enconvo: { label: "Enconvo", homepage: "https://www.enconvo.com" },
		goose: { label: "Goose", homepage: "https://block.github.io/goose/" },
		spinai: { label: "SpinAI", homepage: "https://docs.spinai.dev/" },
		vscode: { label: "Vsc", homepage: "https://code.visualstudio.com" },
	}

	const tabOptions: TabOption[] = Object.entries(clientsConfig).map(
		([value, config]) => {
			const clientType = value as ClientType
			return {
				value: clientType,
				label: config.label,
				icon:
					clientType === "claude" ? (
						<SiAnthropic className="w-4 h-4" />
					) : clientType === "vscode" ? (
						<VscVscode className="w-4 h-4" />
					) : (
						<ServerFavicon
							homepage={config.homepage || ""}
							displayName={config.label}
							className="w-4 h-4"
						/>
					),
			}
		},
	)

	const mainTabs = tabOrder.slice(0, visibleCount)
	const overflowTabs = tabOrder.slice(visibleCount)

	const getTabOption = (value: ClientType) =>
		tabOptions.find((tab) => tab.value === value)!

	return (
		<div className="border-b border-border mb-3">
			<div className="lg:hidden">
				<Select
					value={activeTab}
					onValueChange={(value) => onTabChange(value as ClientType)}
				>
					<SelectTrigger className="w-[150px]">
						<SelectValue>
							<span className="flex items-center gap-2">
								{tabOptions.find((tab) => tab.value === activeTab)?.icon}
								{tabOptions.find((tab) => tab.value === activeTab)?.label}
							</span>
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{tabOptions.map((tab) => (
							<SelectItem key={tab.value} value={tab.value}>
								<span className="flex items-center gap-2">
									{tab.icon}
									{tab.label}
								</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="hidden lg:flex w-full justify-start items-center">
				<TabsList>
					{mainTabs.map((tabValue) => {
						const tab = getTabOption(tabValue)
						return (
							<TabsTrigger
								key={tab.value}
								value={tab.value}
								className="flex items-center gap-2"
							>
								{tab.icon}
								{tab.label}
							</TabsTrigger>
						)
					})}
				</TabsList>
				<OverflowMenu
					tabs={overflowTabs.map(getTabOption)}
					onSelect={onOverflowSelect}
				/>
			</div>
		</div>
	)
}
