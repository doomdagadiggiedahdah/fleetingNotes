"use client"

import type { ServerWithStats } from "@/lib/types/server"
import { BadgeCheck, ExternalLink, FileJsonIcon } from "lucide-react"
import Link from "next/link"
import type { InstallTab } from "./tool-list"
import { InstallCount } from "./install-count"

import { Github } from "lucide-react"
import { UpvoteButton } from "./upvote-button"
import { SiAnthropic, SiTypescript } from "@icons-pack/react-simple-icons"
import { TabContent } from "./tool-tab"

interface ToolCardProps {
	server: ServerWithStats
	activeTab: InstallTab
	isExpanded: boolean
	expand: () => void
	setActiveTab: (tab: InstallTab) => void
}

interface TabButtonProps {
	isActive: boolean
	onClick: (e: React.MouseEvent) => void
	icon?: React.ReactNode
	children: React.ReactNode
}

const TabButton = ({ isActive, onClick, icon, children }: TabButtonProps) => (
	<button
		className={`px-4 py-2 flex items-center gap-2 ${
			isActive ? "border-b-2 border-primary" : ""
		}`}
		onClick={onClick}
	>
		{icon}
		{children}
	</button>
)

export function ToolCard({
	server,
	activeTab,
	isExpanded,
	setActiveTab,
	expand,
}: ToolCardProps) {
	return (
		<div
			role="listitem"
			key={server.id}
			className={`bg-card rounded-lg border border-border p-4 hover:bg-accent transition-colors ${
				isExpanded ? "expanded" : ""
			}`}
			onClick={expand}
		>
			<div className="cursor-pointer">
				<div className="flex items-baseline justify-between mb-2">
					<div className="flex items-center gap-2">
						<div>
							<UpvoteButton
								serverId={server.id}
								upvoteCount={server.upvoteCount}
							/>
						</div>
						<Link
							href={`/protocol/${server.id}`}
							className="text-lg font-semibold text-primary hover:underline flex items-center gap-2"
							onClick={(e) => e.stopPropagation()}
						>
							{server.homepage && (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									src={`https://api.faviconkit.com/${new URL(server.homepage).hostname}/`}
									onError={(e) => {
										e.currentTarget.src = `https://icons.duckduckgo.com/ip3/${new URL(server.homepage).hostname}.ico`
									}}
									alt={server.name}
									className="w-4 h-4"
								/>
							)}
							{server.name}
						</Link>
						{server.verified && (
							<BadgeCheck className="w-4 h-4 text-primary " />
						)}
						<div className="text-muted-foreground text-sm">{server.id}</div>
					</div>
					<InstallCount count={server.installCount} />
				</div>
				<p className="text-card-foreground mb-3 ">{server.description}</p>
			</div>

			{isExpanded && (
				<div className="mt-4 space-y-4 pt-1 mb-4">
					<div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
						<span>Vendor: {server.vendor}</span>
						<a
							href={server.sourceUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center hover:text-primary"
						>
							<Github className="w-4 h-4 mr-1" />
							Source
						</a>
						<a
							href={server.homepage}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center hover:text-primary"
						>
							<ExternalLink className="w-4 h-4 mr-1" />
							Homepage
						</a>
					</div>

					{server.connections[0]?.configSchema?.properties && (
						<div className="text-sm text-card-foreground">
							<h4 className="font-semibold mb-1">Configuration:</h4>
							<ul className="list-disc list-inside">
								{Object.entries(
									server.connections[0].configSchema.properties,
								).map(([key, value]) => (
									<li key={key}>
										{key}:{" "}
										{(value as { description: string })?.description ?? ""}
									</li>
								))}
							</ul>
						</div>
					)}

					<div className="bg-background p-3 rounded-lg border border-border">
						<div className="flex border-b border-border mb-3">
							<TabButton
								isActive={activeTab === "claude"}
								onClick={(e) => {
									e.stopPropagation()
									setActiveTab("claude")
								}}
								icon={<SiAnthropic className="w-4 h-4" />}
							>
								Claude
							</TabButton>
							{/* <TabButton
								isActive={activeTab === "jan"}
								onClick={(e) => {
									e.stopPropagation()
									setActiveTab("jan")
								}}
								icon="👋"
							>
								Jan
							</TabButton> */}
							<TabButton
								isActive={activeTab === "code"}
								onClick={(e) => {
									e.stopPropagation()
									setActiveTab("code")
								}}
								icon={<SiTypescript className="w-4 h-4" />}
							>
								Agent
							</TabButton>
							<TabButton
								isActive={activeTab === "json"}
								onClick={(e) => {
									e.stopPropagation()
									setActiveTab("json")
								}}
								icon={<FileJsonIcon className="w-4 h-4" />}
							>
								JSON
							</TabButton>
						</div>
						<div className="flex items-start justify-between">
							<div className="flex-1">
								<TabContent tool={server} tab={activeTab || "claude"} />
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
