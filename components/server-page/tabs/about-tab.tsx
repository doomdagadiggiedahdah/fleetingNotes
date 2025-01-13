"use client"

import type { ServerWithStats } from "@/lib/types/client"

interface ReadingPanelProps {
	server: ServerWithStats
}

export function AboutPanel({ server }: ReadingPanelProps) {
	return <div className="my-8">{server.description}</div>
}
