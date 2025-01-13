"use client"

import type { FetchedServer } from "@/lib/utils/fetch-registry"

interface ReadingPanelProps {
	server: FetchedServer
}

export function AboutPanel({ server }: ReadingPanelProps) {
	return <div className="my-8">{server.description}</div>
}
