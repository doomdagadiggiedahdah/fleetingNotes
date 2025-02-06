"use client"

import { BuildLogsDialog } from "@/components/server-page/tabs/deployments/build-logs-dialog"
import { DeployButton } from "@/components/server-page/tabs/deployments/deploy"
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
import { GitBranch, ScrollText } from "lucide-react"
import { useEffect, useState } from "react"
import { DeploymentTimer } from "./deployment-timer"

export type Deployment = Database["public"]["Tables"]["deployments"]["Row"]

interface Props {
	server: FetchedServer
}

export function DeploymentsTable({ server }: Props) {
	const [deployments, setDeployments] = useState<Deployment[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [selectedDeployment, setSelectedDeployment] =
		useState<Deployment | null>(null)

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
					setDeployments((prev) => [payload.new as Deployment, ...prev])
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
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Commit</TableHead>
							<TableHead>Branch</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Time</TableHead>
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
									colSpan={4}
									className="text-center text-sm text-gray-500"
								>
									No deployments
								</TableCell>
							</TableRow>
						) : (
							deployments.map((deployment) => (
								<TableRow key={deployment.id}>
									<TableCell>
										<div>
											<div className="flex items-center gap-2">
												<code className="text-sm">
													<a
														href={`${deployment.repo}/commit/${deployment.commit}`}
														target="_blank"
														rel="noopener noreferrer"
														className="text-blue-500 hover:text-blue-700"
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
												{deployment.status === "INTERNAL_ERROR"
													? "Error"
													: deployment.status}
											</span>
											{deployment.logs && (
												<button
													onClick={() => setSelectedDeployment(deployment)}
													className="p-1 hover:bg-gray-100 rounded-full"
													title="View build logs"
												>
													<ScrollText className="h-4 w-4 text-gray-500" />
												</button>
											)}
										</div>
									</TableCell>
									<TableCell
										className={`text-sm ${deployment.status === "QUEUED" ? "text-gray-500" : "text-gray-600"}`}
									>
										<DeploymentTimer
											createdAt={deployment.created_at}
											status={deployment.status}
										/>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
			{selectedDeployment?.logs && (
				<BuildLogsDialog
					deployment={selectedDeployment}
					onClose={() => setSelectedDeployment(null)}
				/>
			)}
		</div>
	)
}

const SkeletonRow = () => (
	<TableRow>
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
