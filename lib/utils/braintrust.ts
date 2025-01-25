import { initLogger, wrapOpenAI } from "braintrust"
import OpenAI from "openai"

export const logger = initLogger({
	projectName: "Smithery",
})

export const llm = wrapOpenAI(new OpenAI())
