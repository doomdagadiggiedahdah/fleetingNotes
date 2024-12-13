import readline from "node:readline"
import { isStdio, RegistryItemSchema, type RegistryItem } from "../types.js"

const processRegistryEntries = async (): Promise<RegistryItem[]> => {
	const input = await new Promise<string>((resolve) => {
		let data = ""
		const rl = readline.createInterface({
			input: process.stdin,
		})
		rl.on("line", (line) => {
			data += `${line}\n`
		})
		rl.on("close", () => resolve(data.trim()))
	})

	const jsonEntries: any[] = input.split("\n").map((c) => JSON.parse(c))
	let entries = jsonEntries
		.map((entry: unknown) => {
			const parsedEntry = RegistryItemSchema.parse(entry)
			if (parsedEntry.connections) {
				parsedEntry.connections = parsedEntry.connections.map((connection) => ({
					...connection,
					configSchema:
						connection.configSchema &&
						Object.keys(connection.configSchema).length > 0
							? connection.configSchema
							: undefined,
				}))
			}
			return parsedEntry
		})
		.filter((entry) => entry.connections.length > 0)

	// Check if all variables defined in configSchema are present and used by stdio command
	entries = entries.filter((entry) => {
		let isBroken = false
		entry.connections.forEach((connection) => {
			if (connection.configSchema && isStdio(connection)) {
				const configVars = Object.keys(connection.configSchema.properties || {})
				const envString = connection.stdio.env
					? Object.entries(connection.stdio.env)
							.map(([key, value]) => `${key}=${value}`)
							.join(" ")
					: ""
				const commandString = `${envString} ${connection.stdio.command} ${(connection.stdio.args ?? []).join(" ")}`

				let numVarsUsed = 0
				configVars.forEach((variable) => {
					if (!commandString.includes(`\${${variable}}`)) {
						console.warn(
							`Warning: Variable '${variable}' is defined in configSchema but not used in stdio command for ${entry.id}`,
						)
						isBroken = true
					} else {
						numVarsUsed += 1
					}
				})

				if (numVarsUsed !== configVars.length) {
					console.warn(
						`Warning: Not all variables in configSchema are used in stdio command for ${entry.id}`,
					)
					isBroken = true
				}
			}
		})
		return !isBroken
	})

	// Eliminate duplicate entries by sourceUrl and id
	entries = entries.reduce((acc: RegistryItem[], current) => {
		const existingEntry = acc.find(
			(entry) =>
				entry.sourceUrl === current.sourceUrl || entry.id === current.id,
		)
		if (!existingEntry) {
			acc.push(current)
		}
		return acc
	}, [])
	return entries
}

const main = async () => {
	const entries = await processRegistryEntries()
	entries.forEach((entry) => {
		console.log(JSON.stringify(entry))
	})
}

main().catch((error) => {
	console.error("An error occurred:", error)
	process.exit(1)
})
