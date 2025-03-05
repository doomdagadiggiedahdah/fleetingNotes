import { Suspense } from "react"
import { getMyApiKeys } from "@/lib/actions/api-keys"
import { ApiKeysList } from "./api-keys-list"
import { CreateApiKey } from "./api-keys-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
	title: "API Keys - Smithery",
	description: "Manage your API keys for Smithery",
}

// Loading component for the API Keys list
function ApiKeysListSkeleton() {
	return (
		<div className="animate-pulse space-y-4">
			<div className="h-20 bg-muted rounded-md" />
			<div className="h-20 bg-muted rounded-md" />
		</div>
	)
}

// Server component that fetches the API key count
async function ApiKeyCount() {
	const result = await getMyApiKeys()
	const count = result.ok ? result.value?.length || 0 : 0

	return <CreateApiKey count={count} />
}

export default async function ApiKeysPage() {
	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-1.5">
				<h2 className="text-2xl font-semibold">API Keys</h2>
				<p className="text-muted-foreground">
					Manage API keys for accessing Smithery programmatically
				</p>
			</div>

			<Suspense fallback={<div className="h-8" />}>
				<ApiKeyCount />
			</Suspense>

			<Suspense fallback={<ApiKeysListSkeleton />}>
				<ApiKeysList />
			</Suspense>
		</div>
	)
}
