// Not used anywhere at the moment but could be used in overview page in the future based on experiment results for `new-install-flow`
import type { JSONSchema } from "@/lib/types/server"
import type { JsonObject } from "@/lib/types/json"

interface ConfigPreviewProps {
	schema: JSONSchema
	values?: JsonObject
}

export function ConfigPreview({ schema, values = {} }: ConfigPreviewProps) {
	const properties = schema?.properties || {}
	const keys = Object.keys(properties)

	if (keys.length === 0) {
		return <div className="text-muted-foreground">No configuration fields.</div>
	}

	return (
		<div className="space-y-2">
			<div className="mb-2 text-sm text-muted-foreground">
				{Object.keys(values).length === 0 &&
					"Sign in to view your saved configuration values."}
			</div>
			<div className="border rounded-lg p-4 bg-muted/30">
				{keys.map((key) => {
					const field = properties[key]
					return (
						<div key={key} className="mb-2">
							<div className="font-medium text-sm text-primary">{key}</div>
							<div className="text-xs text-muted-foreground">
								{field.type}
								{field.description ? ` — ${field.description}` : ""}
							</div>
							<div className="text-sm mt-1">
								{values[key] !== undefined && values[key] !== "" ? (
									String(values[key])
								) : (
									<span className="italic text-muted-foreground">
										(not set)
									</span>
								)}
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}
