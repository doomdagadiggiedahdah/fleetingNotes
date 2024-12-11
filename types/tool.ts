import { z } from "zod"

const ConfigSchemaPropertySchema = z
	.object({
		type: z.string(),
		description: z.string(),
	})
	.optional()

const ConfigSchemaSchema = z
	.object({
		type: z.string(),
		properties: z.record(ConfigSchemaPropertySchema).optional(),
		required: z.array(z.string()).optional(),
	})
	.optional()

const StdioSchema = z.object({
	command: z.string(),
	args: z.array(z.string()),
	env: z.record(z.string()).optional(),
})

const ConnectionSchema = z.object({
	configSchema: ConfigSchemaSchema,
	stdio: StdioSchema,
})

export const ToolSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	vendor: z.string(),
	sourceUrl: z.string().url(),
	license: z.string().optional(),
	homepage: z.string().url(),
	connections: z.array(ConnectionSchema),
})

export type Tool = z.infer<typeof ToolSchema>
