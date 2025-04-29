import { getMe } from "@/lib/supabase/server"
import { Profiles } from "@/components/profiles"
import { CreateProfileDialog } from "@/components/profiles/create-profile-dialog"
import { getProfilesWithServers } from "@/lib/actions/profiles"
import Link from "next/link"

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

	const profilesWithServers = result.value

	return (
		<div className="space-y-6 pb-8">
			<div className="space-y-4">
				<div className="flex flex-col gap-1.5">
					<h2 className="text-2xl font-semibold">Your Profiles</h2>
					<p className="text-muted-foreground">
						Profiles help you group servers together for specific workflows.{" "}
						<Link
							href="/docs/profiles"
							target="_blank"
							className="text-primary hover:underline"
						>
							Learn more
						</Link>
					</p>
				</div>
				<div className="flex justify-end">
					<CreateProfileDialog />
				</div>
			</div>

			<div className="flex flex-col gap-6">
				{profilesWithServers.length === 0 ? (
					<div className="text-muted-foreground">No profiles found.</div>
				) : (
					profilesWithServers.map((profile) => (
						<Profiles key={profile.id} profileServers={profile} />
					))
				)}
			</div>
		</div>
	)
}
