import { getMyApiKeys } from "@/lib/actions/api-keys"
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card"
import { ApiKeysListClient } from "./api-keys-client"
import { redirect } from "next/navigation"

// This is an async server component that fetches and renders the API keys
export async function ApiKeysList() {
	const result = await getMyApiKeys()

	if (!result.ok) {
		redirect("/")
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
	// Transform null values to undefined to match ReturnApiKeys type
	const transformedKeys = apiKeys.map((key) => ({
		...key,
		name: key.name === null ? undefined : key.name,
		is_default: key.is_default === null ? undefined : key.is_default,
	}))

	return <ApiKeysListClient apiKeys={transformedKeys} />
}
