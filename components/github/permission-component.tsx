import Link from "next/link"

export function PermissionNotice() {
	return (
		<p className="text-sm text-muted-foreground">
			<Link
				href="/docs/git"
				className="underline hover:opacity-80 text-primary"
				target="_blank"
			>
				Learn
			</Link>{" "}
			about how we use Github permissions to deploy your server.
		</p>
	)
}
