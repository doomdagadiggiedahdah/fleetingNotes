import { getMe } from "@/lib/supabase/server"
import { Profiles } from "@/components/profiles"
import { getProfilesWithServers } from "@/lib/actions/profiles"

export default async function ProfilesPage() {
	const user = await getMe()
	if (!user) {
		return (
			<div className="p-8 text-center text-muted-foreground">
				You must be signed in to view your profiles.
			</div>
		)
	}

	const result = await getProfilesWithServers()
	if (!result.ok) {
		return (
			<div className="p-8 text-center text-muted-foreground">
				Failed to load profiles: {result.error}
			</div>
		)
	}

	return (
		<div className="pb-8">
			<Profiles profileServers={result.value} />
		</div>
	)
}
