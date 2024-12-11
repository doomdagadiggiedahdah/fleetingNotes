"use client"

import type { Tool } from "@/types/tool"
import { ExternalLink, Github, Copy, CheckCheck, Code } from "lucide-react"
import { useEffect, useState } from "react"
import Search from "./search"
import Image from "next/image"

type InstallTab = "claude" | "jan" | "code"

export default function ToolList({ initialTools }: { initialTools: Tool[] }) {
	const [tools] = useState<Tool[]>(initialTools)
	const [displayedTools, setDisplayedTools] = useState<Tool[]>([])
	const [searchQuery, setSearchQuery] = useState("")
	const [page, setPage] = useState(1)
	const [expandedToolId, setExpandedToolId] = useState<string | null>(null)
	const [copiedToolId, setCopiedToolId] = useState<string | null>(null)
	const [activeTab, setActiveTab] = useState<{ [key: string]: InstallTab }>({})

	const filterTools = (query: string) => {
		return tools.filter(
			(tool) =>
				tool.name.toLowerCase().includes(query.toLowerCase()) ||
				tool.description.toLowerCase().includes(query.toLowerCase()),
		)
	}

	useEffect(() => {
		const filtered = filterTools(searchQuery)
		setDisplayedTools(filtered.slice(0, page * 10))
	}, [searchQuery, page, tools])

	const handleSearch = (query: string) => {
		setSearchQuery(query)
		setPage(1)
	}

	const handleLoadMore = () => {
		setPage((prevPage) => prevPage + 1)
	}

	const toggleToolExpansion = (toolId: string) => {
		setExpandedToolId((prevId) => (prevId === toolId ? null : toolId))
		if (!activeTab[toolId]) {
			setActiveTab((prev) => ({ ...prev, [toolId]: "claude" }))
		}
	}

	const handleCopyCommand = (
		toolId: string,
		content: string,
		e: React.MouseEvent,
	) => {
		e.stopPropagation() // Prevent card expansion when copying

		// Copy to clipboard
		navigator.clipboard
			.writeText(content)
			.then(() => {
				setCopiedToolId(toolId)

				// Reset copied state after 2 seconds
				setTimeout(() => {
					setCopiedToolId(null)
				}, 2000)
			})
			.catch((err) => {
				console.error("Failed to copy command:", err)
			})
	}

	const getTabContent = (tool: Tool, tab: InstallTab) => {
		switch (tab) {
			case "claude":
				return `npx @smithery/get install ${tool.id}`
			case "jan":
				return "Coming soon!"
			case "code":
				return JSON.stringify(tool, null, 2)
			default:
				throw new Error("Invalid tab")
		}
	}

	if (tools.length === 0) {
		return (
			<div className="bg-card rounded-lg border border-border p-4 text-center text-card-foreground">
				No tools found. Check back later for updates.
			</div>
		)
	}

	return (
		<>
			<Search onSearch={handleSearch} />
			<div className="space-y-4 mt-4">
				{displayedTools.map((tool) => (
					<div
						key={tool.id}
						className={`bg-card rounded-lg border border-border p-4 hover:bg-accent transition-colors cursor-pointer ${
							expandedToolId === tool.id ? "expanded" : ""
						}`}
						onClick={() => toggleToolExpansion(tool.id)}
					>
						<div className="flex items-baseline justify-between mb-2">
							<h3 className="text-lg font-semibold text-primary">
								{tool.name}
							</h3>
							{tool.license && (
								<span className="text-sm text-muted-foreground">
									{tool.license}
								</span>
							)}
						</div>
						<p className="text-card-foreground mb-3">{tool.description}</p>

						{expandedToolId === tool.id && (
							<div className="mt-4 space-y-4 border-t border-border pt-4">
								<div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
									<span>Vendor: {tool.vendor}</span>
									<a
										href={tool.sourceUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center hover:text-primary"
									>
										<Github className="w-4 h-4 mr-1" />
										Source
									</a>
									<a
										href={tool.homepage}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center hover:text-primary"
									>
										<ExternalLink className="w-4 h-4 mr-1" />
										Homepage
									</a>
								</div>

								{tool.connections[0]?.configSchema?.properties && (
									<div className="text-sm text-card-foreground">
										<h4 className="font-semibold mb-1">Configuration:</h4>
										<ul className="list-disc list-inside">
											{Object.entries(
												tool.connections[0].configSchema.properties,
											).map(([key, value]) => (
												<li key={key}>
													{key}: {value?.description}
												</li>
											))}
										</ul>
									</div>
								)}

								<div className="bg-background p-3 rounded-lg border border-border">
									<div className="flex border-b border-border mb-4">
										<button
											className={`px-4 py-2 flex items-center gap-2 ${
												activeTab[tool.id] === "claude"
													? "border-b-2 border-primary"
													: ""
											}`}
											onClick={(e) => {
												e.stopPropagation()
												setActiveTab((prev) => ({
													...prev,
													[tool.id]: "claude",
												}))
											}}
										>
											<Image
												src="/anthropic_light.svg"
												alt="Claude"
												width={16}
												height={16}
											/>
											Claude
										</button>
										<button
											className={`px-4 py-2 flex items-center gap-2 ${
												activeTab[tool.id] === "jan"
													? "border-b-2 border-primary"
													: ""
											}`}
											onClick={(e) => {
												e.stopPropagation()
												setActiveTab((prev) => ({ ...prev, [tool.id]: "jan" }))
											}}
										>
											👋 Jan
										</button>
										<button
											className={`px-4 py-2 flex items-center gap-2 ${
												activeTab[tool.id] === "code"
													? "border-b-2 border-primary"
													: ""
											}`}
											onClick={(e) => {
												e.stopPropagation()
												setActiveTab((prev) => ({ ...prev, [tool.id]: "code" }))
											}}
										>
											<Code className="w-4 h-4" />
											Code
										</button>
									</div>
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<h4 className="font-semibold mb-2 text-primary">
												Install Command
											</h4>
											<code className="text-sm bg-accent/50 p-2 rounded block overflow-x-auto whitespace-pre-wrap break-all max-w-full">
												{getTabContent(tool, activeTab[tool.id] || "claude")}
											</code>
										</div>
										<button
											onClick={(e) =>
												handleCopyCommand(
													tool.id,
													getTabContent(tool, activeTab[tool.id] || "claude"),
													e,
												)
											}
											className="ml-4 p-2 rounded hover:bg-accent transition-colors"
											aria-label="Copy installation command"
										>
											{copiedToolId === tool.id ? (
												<CheckCheck className="w-5 h-5 text-green-500" />
											) : (
												<Copy className="w-5 h-5" />
											)}
										</button>
									</div>
								</div>
							</div>
						)}
					</div>
				))}
				{displayedTools.length < tools.length && (
					<div className="text-center py-4">
						<button
							onClick={handleLoadMore}
							className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded"
						>
							Load More
						</button>
					</div>
				)}
			</div>
		</>
	)
}
