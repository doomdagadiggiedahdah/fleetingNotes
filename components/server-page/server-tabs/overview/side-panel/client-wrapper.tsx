"use client"

import { useEffect, useState } from "react"
import posthog from "posthog-js"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { fetchData } from "./fetch-data"

// Hardcoded feature flag key
const NEW_INSTALL_FLOW_FLAG = "new-install-flow"

type Props = {
	server: FetchedServer
	fetchResult: Awaited<ReturnType<typeof fetchData>>
	children: (isNewFlowEnabled: boolean) => React.ReactNode
}

export function SidePanelClientWrapper({
	server,
	fetchResult,
	children,
}: Props) {
	const [isNewFlowEnabled, setIsNewFlowEnabled] = useState(false)

	// Check feature flag on mount
	useEffect(() => {
		const enabled = posthog.getFeatureFlag(NEW_INSTALL_FLOW_FLAG) !== "control"
		setIsNewFlowEnabled(enabled)
	}, [])

	return <>{children(isNewFlowEnabled)}</>
}
