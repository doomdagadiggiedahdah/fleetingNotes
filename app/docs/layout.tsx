import DocsSidebar from "@/components/docs/sidebar"
import type { ReactNode } from "react"

export default function DocsLayout({ children }: { children: ReactNode }) {
	return (
		<div className="min-h-screen flex flex-col bg-background">
			<div className="flex flex-1">
				<DocsSidebar />
				<main className="flex-1 px-8 py-8 max-w-5xl">{children}</main>
			</div>
		</div>
	)
}
