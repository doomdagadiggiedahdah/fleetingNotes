import type { JSONSchema } from "@/lib/types/server"

interface SchemaViewerProps {
	schema: JSONSchema
}

export function SchemaViewer({ schema }: SchemaViewerProps) {
	if (!schema) {
		return (
			<div className="space-y-6">
				<div className="p-6">
					<p className="text-sm text-muted-foreground">
						No configuration schema available.
					</p>
				</div>
			</div>
		)
	}

	// Handle case where schema is an empty object type
	if (
		schema.type === "object" &&
		(!schema.properties || Object.keys(schema.properties).length === 0)
	) {
		return (
			<div className="space-y-6">
				<div className="p-6">
					<p className="text-sm text-muted-foreground">
						No configuration required for this server.
					</p>
				</div>
			</div>
		)
	}

	// Helper function to get a clean description of the schema type
	// const getTypeDescription = (prop: JSONSchema): string => {
	// 	if (prop.type === "array") {
	// 		const itemType = prop.items?.type || "any"
	// 		return `Array<${itemType}>`
	// 	}
	// 	if (prop.enum) {
	// 		return `Enum: ${prop.enum.join(" | ")}`
	// 	}
	// 	return prop.type || "any"
	// }

	// Helper function to render a property
	const renderProperty = (name: string, prop: JSONSchema) => {
		const required = schema.required?.includes(name)
		// const typeDescription = getTypeDescription(prop)
		const description = prop.description || "No description available"

		return (
			<div key={name} className="mb-6 last:mb-0">
				<div className="flex items-start justify-between">
					<div>
						<h3 className="text-sm font-semibold flex items-center gap-2">
							{name}
							{required && (
								<span className="text-xs text-red-500">required</span>
							)}
						</h3>
					</div>
					{prop.default !== undefined && (
						<div className="text-xs text-muted-foreground">
							Default: {JSON.stringify(prop.default)}
						</div>
					)}
				</div>
				<p className="text-sm mt-2 text-muted-foreground">{description}</p>
				{prop.properties && (
					<div className="mt-4 pl-4 border-l border-border">
						{Object.entries(prop.properties).map(
							([subName, subProp]: [string, JSONSchema]) =>
								renderProperty(subName, subProp),
						)}
					</div>
				)}
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="p-6 max-h-[400px] overflow-y-auto dark-scrollbar">
				{schema.properties ? (
					<div className="space-y-6">
						{Object.entries(schema.properties).map(
							([name, prop]: [string, JSONSchema]) =>
								renderProperty(name, prop),
						)}
					</div>
				) : (
					<p className="text-sm text-muted-foreground">
						No configuration required for this server.
					</p>
				)}
			</div>
		</div>
	)
}
