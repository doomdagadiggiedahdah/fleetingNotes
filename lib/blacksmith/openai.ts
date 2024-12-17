import type { LangfuseTraceClient } from "langfuse"
import type OpenAI from "openai"
import type {
	ChatCompletionCreateParamsNonStreaming,
	ChatCompletionMessageParam,
} from "openai/resources/index.js"

export function pruneAllButLastExecResult(
	messages: ChatCompletionMessageParam[],
): ChatCompletionMessageParam[] {
	return messages.map((message, idx) => {
		if (idx === messages.length - 1) {
			return message
		}

		if (message.role === "tool") {
			if (typeof message.content === "string") {
				if (message.content.includes("Execution result:"))
					return { ...message, content: "[Truncated]" }
			} else {
				for (const part of message.content) {
					if (part.type === "text" && part.text.includes("Execution result:")) {
						return { ...message, content: "[Truncated]" }
					}
				}
			}
		}
		return message
	})
}

export async function tracedOpenAIGenerate(
	client: OpenAI,
	trace: LangfuseTraceClient,
	params: ChatCompletionCreateParamsNonStreaming,
) {
	const generation = trace.generation({
		name: "openai-chat-completion",
		model: params.model,
		modelParameters: {
			temperature: params.temperature,
			max_tokens: params.max_tokens,
		},
		input: params.messages,
	})

	const startTime = new Date()
	generation.update({ completionStartTime: startTime })

	const response = await client.chat.completions.create(params)

	generation.end({
		output: response,
	})

	return response
}
