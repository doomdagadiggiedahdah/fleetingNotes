import type { JSONSchema } from "@/lib/types/server"
import type { JsonObject } from "@/lib/types/json"

/**
 * Processes form values against a schema, applying defaults and handling empty values
 * @param values The form values to process
 * @param schema The schema to validate against
 * @returns Processed values with defaults applied
 */
export function processConfig(
	values: JsonObject,
	schema: JSONSchema | null,
): JsonObject {
	if (!schema?.properties) {
		return values
	}

	return Object.entries(schema.properties).reduce(
		(acc, [key, field]: [string, JSONSchema]) => {
			const userValue = values[key]
			const isEmpty = userValue === undefined || userValue === ""

			if (!isEmpty) {
				acc[key] = userValue
			} else if (field.default !== undefined) {
				acc[key] = field.default
			}
			return acc
		},
		{} as JsonObject,
	)
}
