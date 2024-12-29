import type { Connection, JSONSchema } from "@/lib/types/server"
import Ajv from "ajv"

const ajv = new Ajv()

export function generateConfig(connection: Connection, config?: object) {
	// Initializes configuration
	const validate = ajv.compile(connection.configSchema)
	const valid = validate(config)

	if (!valid) {
		return { success: false, error: validate.errors } as const
	}

	if (connection.type !== "stdio") {
		return { success: false, error: "Invalid connection type" } as const
	}
	// Applies configuration
	// biome-ignore lint/security/noGlobalEval: <explanation>
	const stdioFunction = eval(connection.stdioFunction)
	return { success: true, result: stdioFunction(config) } as const
}

/**
 * Creates a dummy schema based on JSONSchema
 * @param configSchema
 * @returns
 */
export function createDummyConfig(
	configSchema: JSONSchema,
): Record<string, unknown> {
	const typeDefaults = {
		string: "...",
		number: 0,
		boolean: false,
		array: [],
	} as const

	const properties = configSchema.properties ?? {}
	const result: Record<string, unknown> = {}

	for (const [key, value] of Object.entries(properties as object)) {
		if (value.type === "string") {
			result[key] = value.description ?? typeDefaults.string
		} else if (value.type === "object") {
			result[key] = createDummyConfig(value)
		} else {
			result[key] =
				typeDefaults[value.type as keyof typeof typeDefaults] ?? null
		}
	}

	return result
}
