"use client"
import { useState, useEffect } from "react"

interface ServerFaviconProps {
	homepage: string | null
	displayName: string
	className?: string
}

export function ServerFavicon({
	homepage,
	displayName,
	className = "w-4 h-4",
}: ServerFaviconProps) {
	const [imgSrc, setImgSrc] = useState<string | null>(null)
	const [isLoaded, setIsLoaded] = useState(false)

	useEffect(() => {
		if (!homepage) return

		try {
			const hostname = new URL(homepage).hostname
			setImgSrc(`https://api.faviconkit.com/${hostname}/`)
		} catch (e) {
			console.error("Invalid URL:", homepage)
		}
	}, [homepage])

	if (!homepage || !imgSrc) return null

	const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
		try {
			const hostname = new URL(homepage).hostname

			if (e.currentTarget.src.includes("faviconkit")) {
				setImgSrc(`https://icons.duckduckgo.com/ip3/${hostname}.ico`)
			} else if (e.currentTarget.src.includes("duckduckgo")) {
				setImgSrc(`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`)
			} else {
				// Hide after all attempts failed
				setImgSrc(null)
			}
		} catch (e) {
			setImgSrc(null)
		}
	}

	return imgSrc ? (
		<img
			src={imgSrc}
			onError={handleError}
			onLoad={() => setIsLoaded(true)}
			alt={displayName}
			className={`${className} rounded-sm bg-background/50 backdrop-blur-sm p-[1px] ${!isLoaded ? "invisible" : "visible"}`}
			style={{
				filter: "contrast(1.1) brightness(1.1)",
			}}
		/>
	) : null
}
