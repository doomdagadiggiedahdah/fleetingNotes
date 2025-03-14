"use client"
import { GithubAuthProvider } from "@/components/github/github-user-provider"
import { PermissionNotice } from "@/components/github/permission-component"
import { RepoSelector } from "@/components/github/repo-selector"
import { Card } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { use } from "react"
import NewServerForm from "./new-server-form"

export const maxDuration = 800

interface Props {
	searchParams: Promise<{
		owner?: string
		repo?: string
	}>
}

export default function NewPage(props: Props) {
	const searchParams = use(props.searchParams)
	const router = useRouter()
	const owner = searchParams.owner
	const repo = searchParams.repo

	if (!owner || !repo) {
		return (
			<div className="w-full max-w-3xl mx-auto">
				<div className="flex flex-col gap-6">
					<p className="text-center text-muted-foreground">
						Distribute your MCP server to over 10,000 users on Smithery.
					</p>

					{/* GitHub Auth Card */}
					<Card className="p-6">
						<div className="flex flex-col justify-center items-center gap-4">
							<GithubAuthProvider>
								<RepoSelector
									onRepoSelect={(owner, repo) => {
										router.push(`/new?owner=${owner}&repo=${repo}`)
									}}
									buttonText="Create"
								/>
							</GithubAuthProvider>
							<PermissionNotice />
						</div>
					</Card>

					{/* Benefits Grid */}
					<div className="grid md:grid-cols-3 gap-4">
						<Card className="p-4">
							<h3 className="text-lg font-semibold mb-1">Distribute</h3>
							<p className="text-sm text-muted-foreground">
								Get your MCP server listed in front of thousands of users.
							</p>
						</Card>
						<Card className="p-4">
							<h3 className="text-lg font-semibold mb-1">Host</h3>
							<p className="text-sm text-muted-foreground">
								Give users install-free access to your MCP server.
							</p>
						</Card>
						<Card className="p-4">
							<h3 className="text-lg font-semibold mb-1">Build</h3>
							<p className="text-sm text-muted-foreground">
								Deploy from your GitHub repository.
							</p>
						</Card>
					</div>
				</div>
			</div>
		)
	}

	return <NewServerForm owner={owner} repo={repo} />
}
