import { initDataset, wrapOpenAI } from "braintrust"
import dotenv from "dotenv"
import { isNil, omit, omitBy, pick } from "lodash"
import OpenAI from "openai"
import type {
	ChatCompletion,
	ChatCompletionMessageParam,
	ChatCompletionTool,
} from "openai/resources/index.mjs"

interface TrainingExample {
	id: string // root span id
	input: string
	messages: ChatCompletionMessageParam[]
	tools?: ChatCompletionTool[]
}

async function generateThoughts(messages: ChatCompletionMessageParam[]) {
	const prompt = `
You are the "assistant" - an thoughtful and smart researcher. You are given a trajectory from a conversation you had where you took an action as a step in completing a task.

Your job is to write out the reasoning behind the last action you made. Your reasoning should concisely (max 3 sentences) describe what you observed and thoughts that led to your final action. A good reasoning chain of thought starts with the evidence and ends with the action decision.

You must write your reasoning as if you're about to take the final action, so use present tense. Refer to your next action with "I will". Be concise and only write about the last action. Do not repeat prior reasonings.

The following is an excerpt of a good reasoning trace made by an assistant, depicted in the \`content\` field. You should follow this style of writing.
<example>
...
  - role: assistant
    content: The JavaScript edition of the E2B MCP server provides a command to run the server using \`npx\` with the package name \`e2b-mcp-server\`. To ensure this package is publicly available and can be installed directly, I need to verify its existence on the npm registry. Therefore, I will check the npm registry for the \`e2b-mcp-server\` package to confirm it is published and available for users to install.
    tool_calls:
      - id: call_I7XIisxvgHcqLOA14h60qQJX
        type: function
        function:
          name: fetch_fetch
          arguments: '{"url":"https://registry.npmjs.com/e2b-mcp-server"}'
  - role: tool
    content: 'Error: Failed to fetch https://registry.npmjs.com/e2b-mcp-server - status code 404'
    tool_call_id: call_I7XIisxvgHcqLOA14h60qQJX
  - role: assistant
    content: Interesting. The JavaScript edition of the MCP is not published on npm, as the attempt to verify its availability resulted in a 404 error from the npm registry. Maybe the authors of the repo made a typo in their README? Let me check their package.json to see if the package name is correct.
    tool_calls:
      - id: call_I7XIisxvgHcqLOA14h60qaaa
        type: function
        function:
          name: gh_get_file_contents
          arguments: '{"owner":"e2b-dev","repo":"mcp-server","path":"packages/js/package.json"}'
...
</example>`

	const llm = wrapOpenAI(new OpenAI())

	const response = await llm.chat.completions.create({
		model: "gpt-4o",
		messages: [
			{
				role: "developer",
				content: prompt,
			},
			{
				role: "user",
				content: `\`\`\`
${JSON.stringify(messages, null, 2)}
\`\`\`
---
You must write your reasoning as if you're about to take the final action, so use present tense. Be concise and only write about the last action. Do not repeat prior reasonings.`,
			},
		],
		temperature: 1,
	})
	const reasoning = response.choices[0].message.content
	if (!reasoning) throw new Error("No reasoning generated")
	return reasoning
}

async function annotateReasoning(messages: ChatCompletionMessageParam[]) {
	const annotatedMessages: ChatCompletionMessageParam[] = []

	for (const message of messages) {
		// Add message to conversation context
		annotatedMessages.push(message)

		if (message.role === "assistant" && !message.content) {
			// Generate reasoning for this assistant message using the conversation context
			const reasoning = await generateThoughts(annotatedMessages)
			// Add the reasoning to the message content
			annotatedMessages[annotatedMessages.length - 1].content = reasoning.trim()
		}
	}

	return annotatedMessages
}

/**
 * Puts traces that were logged into a Braintrust dataset into fine-tuning format
 */
async function main() {
	dotenv.config({ path: ".env.development.local" })

	// Data to insert to
	const inseretDataset = initDataset("Smithery", {
		dataset: "crawl_ft_dataset",
	})
	// Load existing dataset entries and get their IDs
	const existingDataset = await inseretDataset.fetchedData()
	const existingIds = new Set(existingDataset.map((entry) => entry.expected.id))
	console.log(`Found ${existingIds.size} existing examples in dataset`)

	// Data to pull from
	const crawlRawCorrectdataset = initDataset("Smithery", {
		dataset: "crawl_raw_correct",
	})
	const rawData = await crawlRawCorrectdataset.fetchedData()

	// Construct training data
	let newTrainingData: TrainingExample[] = rawData
		.map((row) => {
			// Get all messages
			const messages: TrainingExample["messages"] = [
				...(row.input as ChatCompletionMessageParam[]),
				(row.expected as unknown as ChatCompletion["choices"])[0].message,
			]
			// Find index of first registry_upsert_entry call
			const firstUpsertIndex = messages.findIndex(
				(msg) =>
					msg.role === "assistant" &&
					msg.tool_calls?.some(
						(call) => call.function?.name === "registry_upsert_entry",
					),
			)
			if (firstUpsertIndex === -1) {
				return null
			}

			const trimmedMessages: ChatCompletionMessageParam[] = messages
				// Trim to first registry_upsert_entry call
				.slice(0, firstUpsertIndex + 1)
				// Setup FT format
				.map((msg) => ({
					...msg,
					// Old OpenAI format required for fine-tuning
					role: msg.role === "developer" ? "system" : msg.role,
					// Flatten content into string
					content: Array.isArray(msg.content)
						? msg.content
								.map((part) => part.type === "text" && part.text)
								.join("")
						: msg.content,
				}))
				// Remove unused fields
				.map(
					(msg) =>
						omitBy(
							pick(msg, ["role", "content", "tool_calls", "tool_call_id"]),
							isNil,
						) as unknown as ChatCompletionMessageParam,
				)

			// Overwrite the last registry_upsert_entry with the final output (skipping the mistakes made by the model)
			const lastMsg = trimmedMessages[trimmedMessages.length - 1]
			const lastOrigMsg = messages[messages.length - 1]
			if (
				trimmedMessages.length !== messages.length &&
				lastMsg.role === "assistant" &&
				lastMsg.tool_calls &&
				lastOrigMsg.role === "assistant"
			) {
				// biome-ignore lint/performance/noDelete: We can't have undefined
				delete lastMsg.content
				lastMsg.tool_calls = lastOrigMsg.tool_calls
			}

			const tools = (row.metadata?.tools as unknown as ChatCompletionTool[])
				// Remove "strict" paramter from all tool calls
				.map((tool) => ({
					...tool,
					function: {
						...omit(tool.function, ["strict"]),
					},
				}))

			const example: TrainingExample = {
				id: row.id,
				input: row.id,
				messages: trimmedMessages,
				tools,
			}
			return example
		})
		.filter((example): example is TrainingExample => example !== null)
		.filter((example) => !existingIds.has(example.id))

	console.log(`Extracted ${newTrainingData.length} new training examples`)

	newTrainingData = await Promise.all(
		newTrainingData.map(async (example) => {
			return {
				...example,
				messages: await annotateReasoning(example.messages),
			}
		}),
	)

	for (const example of newTrainingData) {
		const id = inseretDataset.insert({
			id: example.input,
			input: example.input,
			expected: example,
		})
		console.log("Inserted record with id", id)
	}

	console.log(await inseretDataset.summarize())
}

main()
