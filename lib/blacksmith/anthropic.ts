import type { LangfuseTraceClient } from "langfuse"
import type Anthropic from "@anthropic-ai/sdk"
import type { MessageCreateParams } from "@anthropic-ai/sdk/resources/index.js"

export async function tracedAnthropicGenerate(
	client: Anthropic,
	trace: LangfuseTraceClient,
	params: MessageCreateParams,
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
