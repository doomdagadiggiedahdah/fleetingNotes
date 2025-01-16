"use client"

import ErrorMessage from "@/components/error-message"
import ServerList from "@/components/list/server-list"
import type { FetchedServer } from "@/lib/utils/fetch-registry"
import { Header } from "../header"
import { Container } from "../layouts/container"

export const HomeSearch = ({
	servers,
	error,
	initialSearch = "",
}: {
	servers: FetchedServer[]
	error?: string
	initialSearch?: string
}) => {
	return (
		<main className="min-h-screen bg-background">
			<Header />
			<Container className="mt-4">
				<div className="mb-8">
					<p className="text-lg text-muted-foreground text-center">
						Extend your language model with {servers.length} capabilities via{" "}
						<a
							href="https://modelcontextprotocol.io/"
							target="_blank"
							rel="noreferrer"
							className="text-primary hover:underline"
						>
							Model Context Protocol
						</a>{" "}
						servers.
					</p>
				</div>
				{error ? (
					<ErrorMessage message={error} />
				) : (
					<ServerList servers={servers} initialSearch={initialSearch} />
				)}
			</Container>
		</main>
	)
}
