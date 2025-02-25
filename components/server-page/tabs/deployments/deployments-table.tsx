"use client"

import { DeployButton } from "@/components/server-page/tabs/deployments/deploy-button"
import { CardDescription, CardTitle } from "@/components/ui/card"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import type { Database } from "@/db/supabase.types"
import { getDeployments } from "@/lib/actions/deployment"
import { createClient } from "@/lib/supabase/client"
import type { FetchedServer } from "@/lib/utils/get-server"
import { ChevronDown, ChevronRight, GitBranch, Loader2 } from "lucide-react"
import React, { useEffect, useRef, useState } from "react"
import { DeploymentTimer } from "./deployment-timer"

export type Deployment = Database["public"]["Tables"]["deployments"]["Row"]

interface Props {
	server: FetchedServer
}

export function DeploymentsTable({ server }: Props) {
	const [deployments, setDeployments] = useState<Deployment[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

	const toggleRowExpansion = (deploymentId: string) => {
		setExpandedRows((prev) => ({
			...prev,
			[deploymentId]: !prev[deploymentId],
		}))
	}

	useEffect(() => {
		;(async () => {
			setIsLoading(true)
			setDeployments(await getDeployments(server.id))
			setIsLoading(false)
		})()

		const supabase = createClient()
		const channel = supabase
			.channel("deployments")
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "deployments",
					filter: `server_id=eq.${server.id}`,
				},
				(payload) => {
					const newDeployment = payload.new as Deployment

					// Auto-expand new deployments on insert
					setExpandedRows((prev) => ({
						...prev,
						[newDeployment.id]: true,
					}))

					setDeployments((prev) => [newDeployment, ...prev])
				},
			)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "deployments",
					filter: `server_id=eq.${server.id}`,
				},
				(payload) => {
					setDeployments((prev) =>
						prev.map((dep) =>
							dep.id === payload.old.id ? (payload.new as Deployment) : dep,
						),
					)
				},
			)
			.subscribe()

		return () => {
			supabase.removeChannel(channel)
		}
	}, [server.id])

	const hasPendingBuilding = deployments.some(
		(d) => d.status === "WORKING" || d.status === "QUEUED",
	)

	return (
		<div className="space-y-4 mt-8">
			<div className="flex flex-row justify-between">
				<div>
					<CardTitle>Recent Deployments</CardTitle>
					<CardDescription className="my-2">
						Recent deployments and their status.
					</CardDescription>
				</div>
				<DeployButton
					serverId={server.id}
					hasPendingBuilding={hasPendingBuilding}
					deployments={!isLoading ? deployments : null}
				/>
			</div>
			<div>
				<Table className="table-fixed">
					<TableHeader>
						<TableRow>
							<TableHead className="w-8" />
							<TableHead className="w-[60%]">Commit</TableHead>
							<TableHead className="w-[10%]">Branch</TableHead>
							<TableHead className="w-[10%]">Status</TableHead>
							<TableHead className="w-[20%]">Time</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<>
								{[...Array(3)].map((_, i) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
									<SkeletonRow key={i} />
								))}
							</>
						) : deployments.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={5}
									className="text-center text-sm text-gray-500"
								>
									No deployments
								</TableCell>
							</TableRow>
						) : (
							deployments.map((deployment) => (
								<React.Fragment key={`fragment-${deployment.id}`}>
									<TableRow
										key={deployment.id}
										className={`cursor-pointer ${expandedRows[deployment.id] ? "border-b-0" : ""}`}
										onClick={() => toggleRowExpansion(deployment.id)}
									>
										<TableCell className="pr-0 w-8">
											<button
												type="button"
												className="p-1 hover:bg-gray-100 rounded-full"
												onClick={(e) => {
													e.stopPropagation()
													toggleRowExpansion(deployment.id)
												}}
											>
												{expandedRows[deployment.id] ? (
													<ChevronDown className="h-4 w-4 text-gray-500" />
												) : (
													<ChevronRight className="h-4 w-4 text-gray-500" />
												)}
											</button>
										</TableCell>
										<TableCell>
											<div>
												<div className="flex items-center gap-2">
													<code className="text-sm">
														<a
															href={
																server.sourceUrl
																	? `${server.sourceUrl}/commit/${deployment.commit}`
																	: `#`
															}
															target="_blank"
															rel="noopener noreferrer"
															className="text-blue-500 hover:text-blue-700"
															onClick={(e) => e.stopPropagation()}
														>
															{deployment.commit.slice(0, 7)}
														</a>
													</code>
													<span className="text-sm text-gray-600">
														{deployment.commit_message}
													</span>
												</div>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1">
												<GitBranch className="h-3 w-3" />
												<span className="text-sm">{deployment.branch}</span>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<span
													className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
													${
														deployment.status === "SUCCESS"
															? "bg-green-100 text-green-800"
															: deployment.status === "FAILURE" ||
																	deployment.status === "INTERNAL_ERROR"
																? "bg-red-100 text-red-800"
																: deployment.status === "QUEUED"
																	? "bg-gray-100 text-gray-600"
																	: "bg-yellow-100 text-yellow-800"
													}`}
												>
													{deployment.status !== "WORKING" && (
														<span
															className={`h-1.5 w-1.5 rounded-full
														${
															deployment.status === "SUCCESS"
																? "bg-green-600"
																: deployment.status === "FAILURE" ||
																		deployment.status === "INTERNAL_ERROR"
																	? "bg-red-600"
																	: deployment.status === "QUEUED"
																		? "bg-gray-400"
																		: "bg-yellow-600"
														}`}
														/>
													)}
													{deployment.status === "WORKING" && (
														<Loader2 className="h-3 w-3 mr-1 animate-spin text-yellow-600" />
													)}
													{deployment.status === "INTERNAL_ERROR"
														? "Error"
														: deployment.status}
												</span>
											</div>
										</TableCell>
										<TableCell
											className={`text-sm ${deployment.status === "QUEUED" ? "text-gray-500" : "text-gray-600"}`}
										>
											<DeploymentTimer
												createdAt={deployment.created_at}
												updatedAt={deployment.updated_at}
												status={deployment.status}
											/>
										</TableCell>
									</TableRow>
									{expandedRows[deployment.id] && (
										<TableRow
											key={`${deployment.id}-logs`}
											className="bg-gray-900"
										>
											<TableCell colSpan={5} className="p-0">
												<div className="border-t border-gray-700">
													{deployment.logs ? (
														<BuildLogs logs={deployment.logs} />
													) : (
														<div className="max-h-96 overflow-auto">
															<pre className="p-4 text-xs font-mono whitespace-pre-wrap text-gray-300 bg-gray-900 leading-relaxed">
																<div className="text-gray-400 italic">
																	{deployment.status === "QUEUED"
																		? "Build is queued. Logs will appear when the build starts."
																		: deployment.status === "WORKING"
																			? "Build is in progress. Logs will appear soon."
																			: "No logs available for this deployment."}
																</div>
															</pre>
														</div>
													)}
												</div>
											</TableCell>
										</TableRow>
									)}
								</React.Fragment>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	)
}

const SkeletonRow = () => (
	<TableRow>
		<TableCell className="w-8">
			<div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
		</TableCell>
		<TableCell>
			<div className="flex items-center gap-2">
				<div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
				<div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
			</div>
		</TableCell>
		<TableCell>
			<div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
		</TableCell>
		<TableCell>
			<div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
		</TableCell>
		<TableCell>
			<div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
		</TableCell>
	</TableRow>
)

// Helper function to parse logs and extract URLs
function parseLogsWithUrls(logs: string): React.ReactNode[] {
	const urlRegex = /(https?:\/\/[^\s]+)/g
	const content: React.ReactNode[] = []
	let lastIndex = 0
	let match: RegExpExecArray | null

	// Find all URLs in the text
	// biome-ignore lint/suspicious/noAssignInExpressions: Needed for regex exec pattern
	while ((match = urlRegex.exec(logs)) !== null) {
		// Add the text before the URL
		if (match.index > lastIndex) {
			content.push(logs.substring(lastIndex, match.index))
		}

		// Add the URL as a clickable link
		content.push(
			<a
				key={`link-${match[0]}-${match.index}`}
				href={match[0]}
				target="_blank"
				rel="noopener noreferrer"
				className="text-blue-400 hover:text-blue-300 hover:underline"
				onClick={(e) => e.stopPropagation()}
			>
				{match[0]}
			</a>,
		)

		// Update the last index
		lastIndex = match.index + match[0].length
	}

	// Add any remaining text after the last URL
	if (lastIndex < logs.length) {
		content.push(logs.substring(lastIndex))
	}

	return content
}

// Helper component to render logs with clickable links
function BuildLogs({ logs }: { logs: string }) {
	// Reference for the log container - now at top level
	const logContainerRef = useRef<HTMLDivElement>(null)

	// Auto-scroll to bottom when logs update - now at top level
	useEffect(() => {
		if (logContainerRef.current) {
			logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
		}
	}, [logs])

	// Parse logs and extract URLs
	const content = parseLogsWithUrls(logs)

	return (
		<div ref={logContainerRef} className="max-h-96 overflow-auto">
			<pre className="p-4 text-xs font-mono whitespace-pre-wrap text-gray-300 bg-gray-900 leading-relaxed">
				{content}
			</pre>
		</div>
	)
}
