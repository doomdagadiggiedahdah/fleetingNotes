"use client"

import { differenceInSeconds, formatDistanceToNowStrict } from "date-fns"
import { useEffect, useState } from "react"

function formatBuildTime(startDate: Date, currentTime: Date) {
	const seconds = differenceInSeconds(currentTime, startDate)
	const minutes = Math.floor(seconds / 60)
	const remainingSeconds = seconds % 60
	if (minutes > 0) return `${minutes}m ${remainingSeconds}s`
	return `${remainingSeconds}s`
}

interface DeploymentTimerProps {
	createdAt: string
	status: string
}

export function DeploymentTimer({ createdAt, status }: DeploymentTimerProps) {
	const [timeNow, setTimeNow] = useState(new Date())
	const date = new Date(`${createdAt}Z`)
	const isLive = status === "WORKING" || status === "QUEUED"

	useEffect(() => {
		if (!isLive) return

		const interval = setInterval(() => {
			setTimeNow(new Date(Date.now()))
		}, 1000)

		return () => clearInterval(interval)
	}, [isLive])

	if (isLive) {
		return formatBuildTime(date, timeNow)
	}

	return formatDistanceToNowStrict(date, { addSuffix: true })
}
