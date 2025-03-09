import { Connection } from "@/lib/types/server"

/**
 * Chooses the most appropriate connection based on priority order
 */
export function chooseConnection(
	connections: Connection[],
): Connection | null {
	// Filter to only stdio connections
	const stdioConnections = connections.filter(
		(conn) => conn.type === "stdio"
	);
	
	if (stdioConnections.length === 0) return null;

	const priorityOrder = ["npx", "uvx", "docker"];

	for (const priority of priorityOrder) {
		// Just check if the priority string exists in the stdioFunction
		const connection = stdioConnections.find(
			(conn) => conn.stdioFunction.includes(priority)
		);
		if (connection) return connection;
	}

	/* Return first stdio connection if no priority matches */
	return stdioConnections[0];
}