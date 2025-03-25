import { createClient } from "@/lib/supabase/server"
import { err, ok, toResult } from "@/lib/utils/result"
import { createAppAuth } from "@octokit/auth-app"
import { Octokit } from "@octokit/rest"

export async function getSessionUserOctokit() {
	const supabase = await createClient()

	const [
		{
			data: { session },
		},
		{
			data: { user },
		},
	] = await Promise.all([supabase.auth.getSession(), supabase.auth.getUser()])
	if (!session?.provider_token) return null

	return {
		user: user,
		octokit: new Octokit({
			auth: session.provider_token,
		}),
	}
}

export function getAuthApp() {
	return createAppAuth({
		appId: process.env.GITHUB_APP_ID as string,
		privateKey: process.env.GITHUB_APP_PRIVATE_KEY as string,
		clientId: process.env.GITHUB_APP_CLIENT_ID as string,
		clientSecret: process.env.GITHUB_APP_CLIENT_SECRET as string,
	})
}

export function getAppOctokit() {
	return new Octokit({
		authStrategy: createAppAuth,
		auth: {
			appId: process.env.GITHUB_APP_ID as string,
			privateKey: process.env.GITHUB_APP_PRIVATE_KEY as string,
			clientId: process.env.GITHUB_APP_CLIENT_ID as string,
			clientSecret: process.env.GITHUB_APP_CLIENT_SECRET as string,
		},
	})
}

// Github app used by our bot
export function getBotAuthApp() {
	return createAppAuth({
		appId: process.env.BOT_GITHUB_APP_ID as string,
		privateKey: process.env.BOT_GITHUB_APP_PRIVATE_KEY as string,
	})
}

export async function getInstallationToken(
	repoOwner: string,
	repoName: string,
) {
	// Create an app-level Octokit to fetch the installation ID
	const auth = getAuthApp()
	const { token: appToken } = await auth({ type: "app" })

	const appOctokit = new Octokit({
		auth: appToken,
	})

	const result = await toResult(
		appOctokit.rest.apps.getRepoInstallation({
			owner: repoOwner,
			repo: repoName,
		}),
	)

	if (!result.ok) {
		return err("Smithery Github App Installation not found")
	}

	// Generate an installation token, then create an Octokit with it
	const installTokenResult = await toResult(
		auth({
			type: "installation",
			installationId: result.value.data.id,
		}),
	)

	if (!installTokenResult.ok) {
		console.error(installTokenResult.error)
		return err("Failed to generate installation token for app")
	}

	const { token: installToken } = installTokenResult.value

	return ok({ installationId: result.value.data.id, installToken, appToken })
}

export async function getInstallationOctokit(
	repoOwner: string,
	repoName: string,
) {
	// Create an app-level Octokit to fetch the installation ID
	const installationTokenResult = await getInstallationToken(
		repoOwner,
		repoName,
	)
	if (!installationTokenResult.ok) return err(installationTokenResult.error)
	const { installToken } = installationTokenResult.value

	return ok(
		new Octokit({
			auth: installToken,
		}),
	)
}
