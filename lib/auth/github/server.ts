"use server"

import { createClient } from "@/lib/supabase/server"
import { Octokit } from "@octokit/rest"

export async function getOctokit() {
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
