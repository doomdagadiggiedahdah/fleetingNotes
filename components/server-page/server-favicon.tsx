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
				src={`https://icon.horse/icon/${hostname}`}
				onError={(e) => {
					if (homepage) {
						e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
					}
				}}
				alt={displayName}
				className="w-4 h-4 rounded-sm bg-background/50 backdrop-blur-sm p-[1px]"
				style={{
					filter: "contrast(1.1) brightness(1.1)",
				}}
			/>
		)
	} catch (e) {
		return null
	}
}
