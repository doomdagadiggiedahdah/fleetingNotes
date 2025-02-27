import type { ServerConfig } from "@/lib/types/server-config"
import YAML from "yaml"

/**
 * Formats the Smithery YAML configuration with appropriate comments.
 * @param config The YAML content to format
 * @returns Formatted YAML string with comments
 */
export function serializeSmitheryYaml(config: ServerConfig): string {
	const doc = new YAML.Document(config)
	const cmdFuncScalar = doc.getIn(
		["startCommand", "commandFunction"],
		true,
	) as YAML.Scalar
	const schemaScalar = doc.getIn(
		["startCommand", "configSchema"],
		true,
	) as YAML.Scalar

	doc.commentBefore =
		" Smithery configuration file: https://smithery.ai/docs/config#smitheryyaml"
	cmdFuncScalar.commentBefore =
		" A JS function that produces the CLI command based on the given config to start the MCP on stdio."
	cmdFuncScalar.type = "BLOCK_LITERAL"
	schemaScalar.commentBefore =
		" JSON Schema defining the configuration options for the MCP."

	// Ensure trailing new line Unix standard
	return `${doc.toString().trim()}\n`
}
