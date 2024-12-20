import type { Connection, JSONSchema } from "@/lib/types/server"
import Ajv from "ajv"

const ajv = new Ajv()

export function generateConfig(connection: Connection, config: unknown) {
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
export function createDummyConfig(configSchema: JSONSchema) {
	return configSchema?.properties
		? Object.entries(configSchema.properties as object)
				.map(([key, value]) => ({
					[key]:
						value.type === "string"
							? (value.description ?? value.type ?? "...")
							: value.type === "number"
								? 0
								: value.type === "boolean"
									? false
									: value.type === "object"
										? {}
										: value.type === "array"
											? []
											: null,
				}))
				.reduce((a, b) => Object.assign(a, b), {})
		: undefined
}
