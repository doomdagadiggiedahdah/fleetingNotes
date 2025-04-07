"use client"

interface ServerFaviconProps {
	homepage: string | null
	displayName: string
	className?: string
	iconUrl?: string | null
}

export function ServerFavicon({
	homepage,
	displayName,
	className = "w-4 h-4",
	iconUrl,
}: ServerFaviconProps) {
	if (iconUrl) {
		return (
			<img
				src={iconUrl}
				alt={displayName}
				className={`${className} rounded-sm bg-background/50 backdrop-blur-sm p-[1px]`}
				style={{
					filter: "contrast(1.1) brightness(1.1)",
				}}
			/>
		)
	}

	if (!homepage) return null

	try {
		const url = new URL(homepage)
		// Use DuckDuckGo directly for the favicon
		const faviconUrl = `https://icons.duckduckgo.com/ip3/${url.hostname}.ico`

		return (
			<img
				src={faviconUrl}
				alt={displayName}
				className={`${className} rounded-sm bg-background/50 backdrop-blur-sm p-[1px]`}
				style={{
					filter: "contrast(1.1) brightness(1.1)",
				}}
			/>
		)
	} catch (e) {
		return null
	}
}
