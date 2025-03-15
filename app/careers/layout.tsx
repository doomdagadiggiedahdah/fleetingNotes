import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
	title: "Careers | Smithery",
	description:
		"Join our team and help us build the future of agentic services.",
}

export default function CareersLayout({ children }: { children: ReactNode }) {
	return (
		<>
			<main className="container py-8 max-w-5xl mx-auto">{children}</main>
		</>
	)
}
