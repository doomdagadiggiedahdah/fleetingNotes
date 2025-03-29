import type { FetchedServer } from "@/lib/utils/get-server"

/**
 * Extracts prerequisite information from a server configuration.
 * Identifies required tools like Docker or npm based on the server's stdio connection.
 *
 * @param server - The server configuration object
 * @returns Prerequisite information object or null if none found
 */
export function extractPrerequisites(server: FetchedServer): string | null {
	try {
		// Find stdio connection with stdioFunction
		const stdioConnection = server.connections?.find(
			(conn) => conn.type === "stdio" && "stdioFunction" in conn,
		)

		if (!stdioConnection || !("stdioFunction" in stdioConnection)) return null

		// Extract command from stdioFunction
		const match = stdioConnection.stdioFunction.match(
			/command:\s*['"]([^'"]+)['"]/,
		)
		if (!match) return null

		const command = match[1]

		// Check common prerequisites
		if (command === "docker") {
			return "docker"
		} else if (command === "npx" || command.startsWith("npx ")) {
			return "npx"
		}

		// For any other command, return the command itself
		return command
	} catch (error) {
		console.error("Error extracting prerequisites:", error)
		return null
	}
}
