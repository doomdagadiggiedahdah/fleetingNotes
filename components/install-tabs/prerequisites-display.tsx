import { Terminal } from "lucide-react"
import { SiDocker, SiNpm } from "@icons-pack/react-simple-icons"
import { SiBun, SiAstral } from "@icons-pack/react-simple-icons"

// Helper function to get the appropriate documentation URL
function getPrerequisiteUrl(prerequisite: string | null): string | null {
	switch (prerequisite) {
		case "docker":
			return "https://docs.docker.com/get-docker/"
		case "npx":
			return "https://nodejs.org/en"
		case "bunx":
			return "https://bun.sh"
		case "uvx":
			return "https://docs.astral.sh/uv/getting-started/installation/"
		default:
			return null // No redirect for unknown prerequisites
	}
}

interface PrerequisitesDisplayProps {
	prerequisites: string | null
}

export function PrerequisitesDisplay({
	prerequisites,
}: PrerequisitesDisplayProps) {
	if (!prerequisites) return null

	const documentationUrl = getPrerequisiteUrl(prerequisites)

	return (
		<div className="mb-4 flex items-center gap-1.5">
			<span className="text-xs text-gray-400">Requires</span>
			<div className="flex gap-1">
				{documentationUrl ? (
					<a
						href={documentationUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center rounded-full border border-neutral-800 bg-secondary px-2.5 py-1 text-xs shadow-sm transition-colors hover:bg-secondary/80"
					>
						{prerequisites === "docker" ? (
							<>
								<SiDocker className="mr-1.5 h-3.5 w-3.5 text-primary" />
								<span className="text-foreground">Docker</span>
							</>
						) : prerequisites === "npx" ? (
							<>
								<SiNpm className="mr-1.5 h-3.5 w-3.5 text-primary" />
								<span className="text-foreground">npx</span>
							</>
						) : prerequisites === "bunx" ? (
							<>
								<SiBun className="mr-1.5 h-3.5 w-3.5 text-primary" />
								<span className="text-foreground">bunx</span>
							</>
						) : prerequisites === "uvx" ? (
							<>
								<SiAstral className="mr-1.5 h-3.5 w-3.5 text-primary" />
								<span className="text-foreground">uvx</span>
							</>
						) : (
							<>
								<Terminal className="mr-1.5 h-3.5 w-3.5 text-primary" />
								<span className="text-foreground">{prerequisites}</span>
							</>
						)}
					</a>
				) : (
					<div className="inline-flex items-center rounded-full border border-neutral-800 bg-secondary px-2.5 py-1 text-xs">
						<Terminal className="mr-1.5 h-3.5 w-3.5 text-primary" />
						<span className="text-foreground">{prerequisites}</span>
					</div>
				)}
			</div>
		</div>
	)
}
