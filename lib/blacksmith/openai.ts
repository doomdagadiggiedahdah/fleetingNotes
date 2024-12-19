import type { LangfuseTraceClient } from "langfuse"
import type OpenAI from "openai"
import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/index.js"

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
