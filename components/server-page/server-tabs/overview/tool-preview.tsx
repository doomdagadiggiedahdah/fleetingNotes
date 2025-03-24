import { ArrowRight } from "lucide-react"
import Link from "next/link"
import type { Tool } from "@modelcontextprotocol/sdk/types.js"

interface ToolPreviewProps {
	tool: Tool
	href: string
}

export const ToolPreview = ({ tool, href }: ToolPreviewProps) => {
	return (
		<Link href={href}>
			<div className="p-4 border rounded-md mb-3 hover:bg-muted/50 hover:border-primary transition-all cursor-pointer group">
				<div className="flex items-center justify-between">
					<h3 className="font-medium group-hover:text-primary transition-colors">
						{tool.name}
					</h3>
					<ArrowRight
						size={16}
						className="text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
					/>
				</div>
				<p className="text-sm text-muted-foreground line-clamp-2 mt-1">
					{tool.description}
				</p>
			</div>
		</Link>
	)
}
