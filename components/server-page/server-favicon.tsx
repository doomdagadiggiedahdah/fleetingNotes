"use client"

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
	if (!homepage) return null

	try {
		const hostname = new URL(homepage).hostname

		return (
			<img
				src={`https://api.faviconkit.com/${hostname}/`}
				onError={(e) => {
					if (homepage) {
						e.currentTarget.src = `https://icons.duckduckgo.com/ip3/${hostname}.ico`
						e.currentTarget.onerror = () => {
							e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
							e.currentTarget.onerror = () => {
								// If all favicon sources fail, hide the image completely
								e.currentTarget.style.display = "none"
							}
						}
					}
				}}
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
