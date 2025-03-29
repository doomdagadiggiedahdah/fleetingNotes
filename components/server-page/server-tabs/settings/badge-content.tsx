import { Card, CardContent } from "@/components/ui/card"
import { CodeBlock } from "@/components/docs/simple-code-block"
import type { FetchedServer } from "@/lib/utils/get-server"

export const BadgeContent = ({ server }: { server: FetchedServer }) => {
	return (
		<div>
			<h3 className="text-lg font-medium mb-4">GitHub Badge</h3>
			<Card>
				<CardContent className="space-y-4 pt-4">
					<p className="my-2">
						To show a download counter, add this badge to your README:
					</p>
					<img
						src={`/badge/${server.qualifiedName}`}
						alt="Smithery Badge"
						className="mb-4"
					/>
					<CodeBlock
						code={`[![smithery badge](https://smithery.ai/badge/${server.qualifiedName})](https://smithery.ai/server/${server.qualifiedName})`}
						language="markdown"
						showHeader={true}
						headerLabel="Markdown"
					/>
				</CardContent>
			</Card>
		</div>
	)
}
