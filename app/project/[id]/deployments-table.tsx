import { DeployButton } from "@/components/projects/deploy"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { getDeployments } from "@/lib/actions/deployment"
import { Suspense } from "react"
import { DeploymentsTableClient } from "./deployments-table-client"

interface Props {
	projectId: string
}

async function DeploymentsTableContent({ projectId }: Props) {
	const deployments = await getDeployments(projectId)

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<div>
					<CardTitle>Deployment History</CardTitle>
					<CardDescription>Recent deployments and their status</CardDescription>
				</div>
				<DeployButton projectId={projectId} />
			</CardHeader>
			<CardContent>
				<DeploymentsTableClient
					projectId={projectId}
					initialDeployments={deployments}
				/>
			</CardContent>
		</Card>
	)
}

export function DeploymentsTable(props: Props) {
	return (
		<Suspense fallback={<div>Loading deployments...</div>}>
			{/* @ts-expect-error Async Server Component */}
			<DeploymentsTableContent {...props} />
		</Suspense>
	)
}
