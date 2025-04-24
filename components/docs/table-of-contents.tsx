"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface TableOfContentsProps {
	className?: string
}

interface HeadingItem {
	id: string
	text: string
	level: number
}

export function TableOfContents({ className }: TableOfContentsProps) {
	const [headings, setHeadings] = useState<HeadingItem[]>([])
	const [activeId, setActiveId] = useState<string>("")

	useEffect(() => {
		const elements = Array.from(document.querySelectorAll("h1, h2, h3"))
			.filter((element) => element.id) // Only get elements with IDs
			.map((element) => ({
				id: element.id,
				text: element.textContent || "",
				level: Number.parseInt(element.tagName.substring(1)),
			}))
		setHeadings(elements)

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						setActiveId(entry.target.id)
					}
				})
			},
			{ rootMargin: "-100px 0px -66%" },
		)

		elements.forEach(({ id }) => {
			const element = document.getElementById(id)
			if (element) observer.observe(element)
		})

		return () => observer.disconnect()
	}, [])

	return (
		<div
			className={cn(
				"hidden lg:block w-48 flex-shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-6",
				className,
			)}
		>
			<div className="text-md font-medium">On this page</div>
			<ul className="mt-4 space-y-3 text-sm list-none">
				{headings.map((heading) => (
					<li
						key={heading.id}
						style={{
							paddingLeft: `${(heading.level - 1) * 16}px`,
						}}
					>
						<a
							href={`#${heading.id}`}
							className={cn(
								"text-muted-foreground hover:text-foreground transition-colors",
								activeId === heading.id && "text-foreground font-medium",
							)}
							onClick={(e) => {
								e.preventDefault()
								const element = document.getElementById(heading.id)
								if (element) {
									const topOffset = 20 // Add breathing space at the top
									const elementPosition = element.getBoundingClientRect().top
									const offsetPosition =
										elementPosition + window.scrollY - topOffset
									window.scrollTo({
										top: offsetPosition,
										behavior: "smooth",
									})
								}
							}}
						>
							{heading.text}
						</a>
					</li>
				))}
			</ul>
		</div>
	)
}
