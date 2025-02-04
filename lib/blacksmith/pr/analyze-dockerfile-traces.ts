import dotenv from "dotenv"

interface BraintrustEvent {
	id: string
	_xact_id: string
	created: string
	input: unknown
	output: unknown
	expected: unknown
	span_attributes: {
		name: string
		type: string
	}
	context: {
		caller_functionname: string
		caller_filename: string
	}
}

interface BraintrustResponse {
	events: BraintrustEvent[]
	cursor: string
}

async function fetchAllEvents(
	projectId: string,
	apiKey: string,
	total = 5000,
): Promise<BraintrustEvent[]> {
	const allEvents: BraintrustEvent[] = []
	let cursor: string | undefined
	const limit = 500

	do {
		// Construct URL with pagination
		const url = new URL(
			`https://api.braintrust.dev/v1/project_logs/${projectId}/fetch`,
		)
		url.searchParams.append("limit", limit.toString())
		if (cursor) {
			url.searchParams.append("cursor", cursor)
		}

		// Fetch page of events
		const response = await fetch(url.toString(), {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		})

		if (!response.ok) {
			throw new Error(`Failed to fetch logs: ${response.statusText}`)
		}

		const data: BraintrustResponse = await response.json()
		allEvents.push(...data.events)

		// Update cursor for next page
		cursor = data.cursor

		if (data.events.length > 0) {
			console.log(`Fetched ${data.events.length} events...`)
		}
	} while (cursor && allEvents.length < total)

	return allEvents
}

async function analyzeDockerfileTraces() {
	console.log("Analyzing Dockerfile generation traces from Braintrust...")
	dotenv.config({ path: ".env.development.local" })

	const projectId = process.env.BRAINTRUST_PROJECT_ID
	const apiKey = process.env.BRAINTRUST_API_KEY

	if (!projectId || !apiKey) {
		throw new Error(
			"BRAINTRUST_PROJECT_ID and BRAINTRUST_API_KEY environment variables are required",
		)
	}

	// Fetch all events with pagination
	const events = await fetchAllEvents(projectId, apiKey)

	const stats = {
		nodejs: 0,
		python: 0,
		unknown: 0,
	}

	// Analyze each event
	for (const event of events) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const output: any = event.output

		if (!output || !Object.keys(output).includes("newFiles")) continue

		try {
			const dockerfile = output.newFiles.dockerFile
			if (!dockerfile) continue

			const content = dockerfile.toLowerCase()

			// Check for technology indicators
			const hasNode = ["node", "npm", "npx", "yarn", "pnpm"].some((term) =>
				content.includes(term),
			)
			const hasPython = [
				"python",
				"pip",
				"uvicorn",
				"gunicorn",
				"uvx",
				"uv",
			].some((term) => content.includes(term))

			if (hasNode && !hasPython) stats.nodejs++
			else if (hasPython && !hasNode) stats.python++
			else stats.unknown++

			if (!hasPython && !hasNode) console.log(dockerfile)
		} catch (error) {
			console.error("Failed to parse Dockerfile output:", error)
			stats.unknown++
		}
	}

	// Calculate totals and percentages
	const total = Object.values(stats).reduce((a, b) => a + b, 0)

	console.log("\nTechnology Distribution in Generated Dockerfiles:")
	Object.entries(stats).forEach(([tech, count]) => {
		const percentage = ((count / total) * 100).toFixed(1)
		console.log(`${tech}: ${count} (${percentage}%)`)
	})

	console.log(`\nTotal Dockerfiles analyzed: ${total}`)
	console.log(`Total events found: ${events.length}`)
}

// Run the analysis
if (require.main === module) {
	analyzeDockerfileTraces()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error("Error analyzing Dockerfile traces:", error)
			process.exit(1)
		})
}
