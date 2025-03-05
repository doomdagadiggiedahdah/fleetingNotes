import { getMyApiKeys } from "@/lib/actions/api-keys"
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card"
import { ApiKeysListClient } from "./api-keys-client"

// This is an async server component that fetches and renders the API keys
export async function ApiKeysList() {
	const result = await getMyApiKeys()

	if (!result.ok) {
		throw new Error(result.error)
	}

	const apiKeys = result.value || []

	if (apiKeys.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>No API Keys</CardTitle>
					<CardDescription>
						You haven&apos;t created any API keys yet. Use the &quot;Create API
						Key&quot; button above to get started.
					</CardDescription>
				</CardHeader>
			</Card>
		)
	}

	// Pass server data to client component for rendering with optimistic UI updates
	return <ApiKeysListClient apiKeys={apiKeys} />
}
