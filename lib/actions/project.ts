"use server"

import { db } from "@/db"
import { projects } from "@/db/schema"
import { createClient } from "@/lib/supabase/server"
import { createAppAuth } from "@octokit/auth-app"
import { Octokit } from "@octokit/core"
import type { RequestError } from "@octokit/request-error"

interface CreateProjectInputs {
	id: string
	name: string
	description: string
	config: string
	owner: string
	repo: string
	installationId: number
}
const commitFile = async (data: CreateProjectInputs) => {
	// Create Octokit instance with installation token
	const octokit = new Octokit({
		authStrategy: createAppAuth,
		auth: {
			appId: process.env.GITHUB_APP_ID!,
			privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
			installationId: data.installationId,
		},
	})

	// Check if file exists and get its content
	try {
		const existingFile = await octokit.request(
			"GET /repos/{owner}/{repo}/contents/{path}",
			{
				owner: data.owner,
				repo: data.repo,
				path: "smithery.yaml",
			},
		)

		if (Array.isArray(existingFile.data) || existingFile.data.type !== "file") {
			throw new Error("We were unable to parse or update smithery.yaml.")
		}

		const existingContent = Buffer.from(
			existingFile.data.content,
			"base64",
		).toString()
		if (existingContent === data.config) {
			// File exists and content is identical, skip update
			console.log("File exists with identical content, skipping update")
			return
		}

		// Update existing file
		await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
			owner: data.owner,
			repo: data.repo,
			path: "smithery.yaml",
			message: "Update Smithery configuration",
			content: Buffer.from(data.config).toString("base64"),
			sha: existingFile.data.sha,
		})
	} catch (error: unknown) {
		if ((error as RequestError).status === 404) {
			// File doesn't exist, create it
			await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
				owner: data.owner,
				repo: data.repo,
				path: "smithery.yaml",
				message: "Add Smithery configuration",
				content: Buffer.from(data.config).toString("base64"),
			})
		} else {
			throw error
		}
	}
}

// Server action to create project and commit config
export const createProject = async (data: CreateProjectInputs) => {
	const supabase = await createClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return { error: "Unauthorized" }
	}

	// Check if project exists
	const { project } = await getProject(data.id)

	if (project) {
		return { error: "Project ID already exists" }
	}

	await commitFile(data)

	try {
		// Create the project in the database
		await db.insert(projects).values({
			id: data.id,
			owner: user.id,
			name: data.name,
			description: data.description,
			repoUrl: `https://github.com/${data.owner}/${data.repo}`,
		})
	} catch (error) {
		return { error: "Failed to create new project." }
	}

	return {}
}

// Server action to get project details
export const getProject = async (projectId: string) => {
	const supabase = await createClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return { error: "Unauthorized" }
	}

	// Get project details
	const { data: project, error: projectError } = await supabase
		.from("projects")
		.select("*")
		.eq("id", projectId)
		.eq("owner", user.id)
		.single()

	if (projectError) {
		return { error: "Failed to fetch project" }
	}
	if (!project) {
		return { error: "Project not found" }
	}
	return { project }
}
