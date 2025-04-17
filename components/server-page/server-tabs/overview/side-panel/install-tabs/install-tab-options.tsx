"use client"

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMemo } from "react"
import { OverflowMenu } from "./overflow-menu"
import type { ClientType } from "@/lib/utils/generate-command"
import { CLIENTS_CONFIG } from "@/lib/config/clients"
import { getClientIcon } from "@/components/server-page/server-tabs/overview/side-panel/install-tabs/icons"

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

const renderSelectItem = (tab: TabOption) => (
	<SelectItem key={tab.value} value={tab.value}>
		<span className="flex items-center gap-2 max-w-[250px]">
			{tab.icon}
			<span className="truncate">{tab.label}</span>
		</span>
	</SelectItem>
)

export function InstallTabOptions({
	activeTab,
	tabOrder,
	visibleCount,
	onTabChange,
	onOverflowSelect,
}: InstallTabOptionsProps) {
	const tabOptions = useMemo(
		() =>
			Object.entries(CLIENTS_CONFIG).map(([value, config]) => ({
				value: value as ClientType,
				label: config.label,
				icon: getClientIcon(value as ClientType, config),
			})),
		[],
	)

	const { mainTabs, overflowTabs } = useMemo(
		() => ({
			mainTabs: tabOrder.slice(0, visibleCount),
			overflowTabs: tabOrder.slice(visibleCount),
		}),
		[tabOrder, visibleCount],
	)

	const getTabOption = (value: ClientType) =>
		tabOptions.find((tab) => tab.value === value)!

	const activeTabOption = useMemo(
		() => getTabOption(activeTab),
		[activeTab, tabOptions],
	)

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
								{activeTabOption.icon}
								{activeTabOption.label}
							</span>
						</SelectValue>
					</SelectTrigger>
					<SelectContent>{tabOptions.map(renderSelectItem)}</SelectContent>
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
								className="flex items-center gap-2 px-3"
							>
								{tab.icon}
								<span>{tab.label}</span>
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
