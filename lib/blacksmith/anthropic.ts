import type Anthropic from "@anthropic-ai/sdk"
import type {
	MessageCreateParamsNonStreaming,
	MessageParam,
} from "@anthropic-ai/sdk/resources/messages/messages.mjs"
import type { LangfuseTraceClient } from "langfuse"

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

	const response = await client.messages.create(params)

	generation.end({
		output: response,
	})

	return response
}

export function cacheLastMessage(messages: MessageParam[]): MessageParam[] {
	const cachedMessages: MessageParam[] = JSON.parse(JSON.stringify(messages))
	const lastMessage = cachedMessages.at(-1)
	if (!lastMessage) return messages

	const content = lastMessage?.content
	if (Array.isArray(content)) {
		content[0].cache_control = { type: "ephemeral" }
	} else if (typeof lastMessage.content === "string") {
		lastMessage.content = [
			{
				type: "text",
				text: lastMessage.content,
				cache_control: { type: "ephemeral" },
			},
		]
	}
	return cachedMessages
}
