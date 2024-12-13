import { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

import type Anthropic from "@anthropic-ai/sdk"
import type {
	MessageCreateParamsNonStreaming,
	PromptCachingBetaMessageParam,
	PromptCachingBetaTool,
} from "@anthropic-ai/sdk/resources/beta/prompt-caching/index.js"
import type { LangfuseTraceClient } from "langfuse"
import { RegistryItemSchema } from "../types.js"

export const CREATE_REGISTRY_ENTRY = "create_registry_entry"
export const MAX_TOOL_CHAR = 100_000

export function truncateToolContent(
	messages: PromptCachingBetaMessageParam[],
): PromptCachingBetaMessageParam[] {
	const messagesCopy: PromptCachingBetaMessageParam[] = JSON.parse(
		JSON.stringify(messages),
	)
	return messagesCopy.map((message, idx) => {
		if (typeof message.content === "string") {
			if (message.content.length > MAX_TOOL_CHAR) {
				message.content = `${message.content.slice(0, MAX_TOOL_CHAR)}...[Truncated]`
			}
			return message
		}

		for (const part of message.content) {
			if (part.type === "tool_result" && part.content) {
				if (typeof part.content === "string") {
					if (part.content.length > MAX_TOOL_CHAR) {
						part.content = `${part.content.slice(0, MAX_TOOL_CHAR)}...[Truncated]`
					}
				} else {
					for (const content of part.content) {
						if (
							content.type === "text" &&
							content.text.length > MAX_TOOL_CHAR
						) {
							content.text = `${content.text.slice(0, MAX_TOOL_CHAR)}...[Truncated]`
						}
					}
				}
			}
		}

		return message
	})
}

export function pruneAllButLastExecResult(
	messages: PromptCachingBetaMessageParam[],
): PromptCachingBetaMessageParam[] {
	const messagesCopy: PromptCachingBetaMessageParam[] = JSON.parse(
		JSON.stringify(messages),
	)
	return messagesCopy.map((message, idx) => {
		if (idx === messages.length - 1) {
			return message
		}

		if (typeof message.content === "string") {
			return message
		}

		for (const part of message.content) {
			if (part.type === "tool_result" && typeof part.content === "string") {
				if (part.content.includes("Execution result:")) {
					part.content = "[Truncated]"
				}
			}
		}

		return message
	})
}

export function cacheLastMessage(messages: PromptCachingBetaMessageParam[]) {
	const cachedMessages = JSON.parse(JSON.stringify(messages))
	const lastMsg = cachedMessages.at(-1)
	const content = lastMsg.content
	if (Array.isArray(content)) {
		content[0].cache_control = { type: "ephemeral" }
	} else {
		lastMsg.content = [
			{
				type: "text",
				text: lastMsg.content,
				cache_control: { type: "ephemeral" },
			},
		]
	}
	return cachedMessages
}

export async function tracedAnthropicGenerate(
	client: Anthropic,
	trace: LangfuseTraceClient,
	params: MessageCreateParamsNonStreaming,
) {
	const generation = trace.generation({
		name: "anthropic-chat-completion",
		model: params.model,
		modelParameters: {
			temperature: params.temperature,
			max_tokens: params.max_tokens,
		},
		input: params.messages,
	})

	const startTime = new Date()
	generation.update({ completionStartTime: startTime })

	const response = await client.beta.promptCaching.messages.create(params)

	generation.end({
		output: response,
	})

	return response
}
export const writeRegistryTool: PromptCachingBetaTool = {
	name: CREATE_REGISTRY_ENTRY,
	description: "Use this tool when you're ready to output the final result",
	input_schema: zodToJsonSchema(
		z.object({
			item: RegistryItemSchema.optional().describe(
				"The MCP entry to create. Leave as undefined if you cannot produce an entry.",
			),
		}),
	) as any,
}
