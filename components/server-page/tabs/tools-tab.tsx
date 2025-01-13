"use client"

import { Card } from "@/components/ui/card"
import { PlayCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { useMCP } from "@/context/mcp-context"
import type { FetchedServer } from "@/lib/utils/fetch-registry"
import Search from "@/components/search"

interface ToolsPanelProps {
	server: FetchedServer
}

interface ToolParameter {
	description: string
	// Add other parameter properties if needed
}

export function ToolsPanel({ server }: ToolsPanelProps) {
	const { status, connect, listTools, tools } = useMCP()
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [searchQuery, setSearchQuery] = useState("")

	useEffect(() => {
		async function loadTools() {
			if (status !== "connected") return

			setIsLoading(true)
			setError(null)

			try {
				await listTools()
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to fetch tools")
			} finally {
				setIsLoading(false)
			}
		}

		loadTools()
	}, [status, listTools])

	const handleConnect = async () => {
		setIsLoading(true)
		setError(null)
		try {
			await connect() //(server.url) // Modified to use server.url
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to connect")
		} finally {
			setIsLoading(false)
		}
	}

	const handleSearch = async (query: string) => {
		setSearchQuery(query)
	}

	const filteredTools = tools.filter(
		(tool) =>
			tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			tool.description?.toLowerCase().includes(searchQuery.toLowerCase()),
	)

	if (status === "disconnected") {
		return (
			<Card className="p-6 border-0">
				<div className="flex flex-col items-center justify-center space-y-4">
					<p className="text-sm text-muted-foreground">
						Not connected to {server.displayName}
					</p>
					{error && <p className="text-sm text-red-500">{error}</p>}
					<Button
						variant="outline"
						onClick={handleConnect}
						disabled={isLoading}
						className="flex items-center gap-2"
					>
						{isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
						{isLoading ? "Connecting..." : "Connect to Server"}
					</Button>
				</div>
			</Card>
		)
	}

	if (isLoading) {
		return (
			<Card className="p-6 border-0">
				<div className="flex items-center justify-center">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			</Card>
		)
	}

	return (
		<div className="space-y-6">
			<Card className="p-6 border-0">
				<Search onSearch={handleSearch} initialValue={searchQuery} />

				{filteredTools.length === 0 ? (
					<div className="text-sm text-muted-foreground text-center py-4">
						{searchQuery
							? "No tools found matching your search"
							: "No tools available"}
					</div>
				) : (
					<div className="space-y-4 mt-4">
						{filteredTools.map((tool) => (
							<div
								key={tool.name}
								className="border border-border rounded-lg p-4 bg-background"
							>
								<div className="flex items-start justify-between">
									<div>
										<h3 className="font-semibold text-primary">{tool.name}</h3>
										<p className="text-sm text-muted-foreground mt-1">
											{tool.description}
										</p>
									</div>
									<Button
										variant="outline"
										size="sm"
										className="flex items-center gap-2"
									>
										<PlayCircle className="w-4 h-4" />
										Run
									</Button>
								</div>

								{Object.keys(tool.parameters || {}).length > 0 && (
									<div className="mt-4">
										<h4 className="text-sm font-medium mb-2">Parameters:</h4>
										<div className="space-y-2">
											{Object.entries(tool.parameters || {}).map(
												([name, param]: [string, ToolParameter]) => (
													<div
														key={name}
														className="text-sm grid grid-cols-[100px,1fr] gap-2"
													>
														<span className="font-mono text-primary">
															{name}
														</span>
														<span className="text-muted-foreground">
															{param.description}
														</span>
													</div>
												),
											)}
										</div>
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</Card>
		</div>
	)
}
