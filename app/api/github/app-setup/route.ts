import { createClient } from "@/lib/supabase/server"
import { assignUnclaimedServers } from "@/lib/utils/assign-server-owners"

// TODO: this needs more work
// Callback when the GitHub app is installed as a notification
export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const installationId = searchParams.get("installation_id")
		const setupAction = searchParams.get("setup_action")
		// const state = searchParams.get("state")

		if (!installationId) {
			return new Response("Missing installation_id", { status: 400 })
		}

		const supabase = await createClient()
		const {
			data: { session },
		} = await supabase.auth.getSession()

		if (!session?.user) {
			return new Response("Unauthorized", { status: 401 })
		}

		// TODO: Check for installation ID spoofing
		await assignUnclaimedServers([Number.parseInt(installationId)])

		// Store the installation in Supabase
		// const { error } = await supabase.from("github_installations").upsert(
		// 	{
		// 		installation_id: installationId,
		// 		user_id: session.user.id,
		// 		setup_action: setupAction,
		// 		installed_at: new Date().toISOString(),
		// 	},
		// 	{
		// 		onConflict: "installation_id",
		// 	},
		// )

		// if (error) {
		// 	console.error("Failed to store installation:", error)
		// 	return new Response("Failed to store installation", { status: 500 })
		// }

		// Return HTML that closes the popup and refreshes the parent
		return new Response(
			`
<!DOCTYPE html>
<html>
<head><title>Setup Complete</title></head>
<body>
  <script>
    window.opener.location.reload();
    window.close();
  </script>
  <p>Setup complete! You can close this window.</p>
</body>
</html>
`,
			{
				headers: {
					"Content-Type": "text/html",
				},
			},
		)
	} catch (error) {
		console.error("Setup error:", error)
		return new Response("Internal Server Error", { status: 500 })
	}
}
