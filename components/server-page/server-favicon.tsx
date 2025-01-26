"use client"

interface ServerFaviconProps {
	homepage: string | null
	displayName: string
}

export function ServerFavicon({ homepage, displayName }: ServerFaviconProps) {
	if (!homepage) return null

	try {
		const hostname = new URL(homepage).hostname

		return (
			<img
				src={`https://api.faviconkit.com/${hostname}/`}
				onError={(e) => {
					if (homepage)
						e.currentTarget.src = `https://icons.duckduckgo.com/ip3/${hostname}.ico`
				}}
				alt={displayName}
				className="w-4 h-4"
			/>
		)
	} catch (e) {
		return null
	}
}
