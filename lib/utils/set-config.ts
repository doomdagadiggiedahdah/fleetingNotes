import type { JSONSchema, SchemaValueType } from "@/lib/types/server"
import type { JsonObject } from "@/lib/types/json"

export function getInitialConfig(
	schema: JSONSchema,
	initialConfig: JsonObject = {},
): JsonObject {
	const defaults = Object.entries(schema?.properties || {}).reduce(
		(acc, [key, field]: [string, JSONSchema]) => {
			let defaultValue = field.default
			if (field.type === "boolean") {
				defaultValue =
					typeof defaultValue === "string"
						? defaultValue === "true"
						: defaultValue
			} else if (field.type === "number") {
				defaultValue =
					typeof defaultValue === "string"
						? Number.parseFloat(defaultValue)
						: defaultValue
			}
			acc[key] = defaultValue !== undefined ? defaultValue : ""
			return acc
		},
		{} as JsonObject,
	)
	return { ...defaults, ...initialConfig }
}

export function parseConfigValue(
	field: JSONSchema,
	value: SchemaValueType,
): SchemaValueType {
	if (field?.type === "boolean") {
		if (typeof value === "boolean") return value
		return value === "true"
	} else if (field?.type === "number") {
		if (typeof value === "number") return value
		return Number.parseFloat(value as string)
	}
	return value
}

// New utility function to handle applying default values to empty fields
export function applyDefaultValues(
	values: JsonObject,
	schema: JSONSchema,
): JsonObject {
	const finalValues = { ...values }

	if (schema.properties) {
		Object.entries(schema.properties).forEach(([key, field]) => {
			// If the field is empty/undefined and has a default value, use the default
			if (
				(finalValues[key] === undefined || finalValues[key] === "") &&
				typeof field === "object" &&
				field &&
				"default" in field
			) {
				finalValues[key] = field.default as JsonObject[string]
			}
		})
	}

	return finalValues
}
