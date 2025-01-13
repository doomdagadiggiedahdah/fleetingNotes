"use client"

interface ServerFaviconProps {
	homepage: string
	displayName: string
}

export function ServerFavicon({ homepage, displayName }: ServerFaviconProps) {
	const hostname = new URL(homepage).hostname

	return (
		<img
			src={`https://api.faviconkit.com/${hostname}/`}
			onError={(e) => {
				e.currentTarget.src = `https://icons.duckduckgo.com/ip3/${hostname}.ico`
			}}
			alt={displayName}
			className="w-4 h-4"
		/>
	)
}
