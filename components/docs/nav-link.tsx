"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function NavLink({
	href,
	children,
}: { href: string; children: React.ReactNode }) {
	const pathname = usePathname()
	const isActive = pathname === href

	return (
		<Link
			href={href}
			className={`block px-4 py-2 text-sm transition-colors rounded-md ${
				isActive
					? "text-primary font-medium bg-primary/5"
					: "text-muted-foreground hover:text-foreground"
			}`}
		>
			{children}
		</Link>
	)
}
