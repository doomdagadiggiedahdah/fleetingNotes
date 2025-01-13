import type { Database } from "@/db/supabase.types"
import { getDeployments } from "@/lib/actions/deployment"
import { Suspense } from "react"
import { DeploymentsTableClient } from "../../../components/server-page/tabs/deployments/deployments-table-client"

type Project = Database["public"]["Tables"]["projects"]["Row"]

interface Props {
	project: Project
}

async function DeploymentsTableContent({ project }: Props) {
	const deployments = await getDeployments(project.id)

	return (
		<DeploymentsTableClient server={project} initialDeployments={deployments} />
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
