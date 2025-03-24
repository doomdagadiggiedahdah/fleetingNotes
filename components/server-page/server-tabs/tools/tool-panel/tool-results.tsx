import type { CompatibilityCallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"

interface ToolResultsProps {
	isExecuting: boolean
	error: string | null
	result: CompatibilityCallToolResult | null
}

export function ToolResults({ isExecuting, error, result }: ToolResultsProps) {
	return (
		<div className="w-full px-6">
			<h4 className="font-medium mb-2">Results</h4>
			{isExecuting ? (
				<div className="space-y-2">
					<Skeleton className="h-4 w-[250px]" />
					<Skeleton className="h-4 w-[200px]" />
					<Skeleton className="h-4 w-[300px]" />
				</div>
			) : error ? (
				<div className="text-sm text-red-500 break-words">{error}</div>
			) : result ? (
				<ScrollArea className="h-[500px] w-full">
					<pre className="text-sm bg-muted/50 p-4 rounded-lg whitespace-pre-wrap break-words w-full">
						{Array.isArray(result.content) &&
							result.content.map((item, index) =>
								item.type === "text" ? (
									<span
										key={`${item.type}-${index}`}
										className="inline-block w-full"
									>
										{item.text}
									</span>
								) : null,
							)}
					</pre>
				</ScrollArea>
			) : (
				<div className="text-sm text-muted-foreground">
					Execute the tool to see results
				</div>
			)}
		</div>
	)
}
