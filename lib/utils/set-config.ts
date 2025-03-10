import type { JSONSchema } from "@/lib/types/server";
import type { JsonObject } from "@/lib/types/json";

export function getInitialConfig(schema: JSONSchema, initialConfig: JsonObject = {}): JsonObject {
  const defaults = Object.entries(schema?.properties || {}).reduce(
    (acc, [key, field]: [string, JSONSchema]) => {
      let defaultValue = field.default;
      if (field.type === "boolean") {
        defaultValue = typeof defaultValue === "string" ? defaultValue === "true" : defaultValue;
      } else if (field.type === "number") {
        defaultValue = typeof defaultValue === "string" ? parseFloat(defaultValue) : defaultValue;
      }
      acc[key] = defaultValue !== undefined ? defaultValue : "";
      return acc;
    },
    {} as JsonObject
  );
  return { ...defaults, ...initialConfig };
}

export function parseConfigValue(field: JSONSchema, value: string): string | number | boolean {
  if (field?.type === "boolean") {
    return value === "true";
  } else if (field?.type === "number") {
    return parseFloat(value);
  }
  return value;
}
