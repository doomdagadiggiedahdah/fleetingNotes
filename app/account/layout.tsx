"use client"

import { Container } from "@/components/layouts/container"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/context/auth-context"
import { redirect, usePathname } from "next/navigation"
import { Key } from "lucide-react"

const navItems = [
	{
		name: "API Keys",
		href: "/account/api-keys",
		icon: <Key className="h-4 w-4" />,
	},
]

export default function AccountLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const { currentSession, stateChangedOnce } = useAuth()
	const pathname = usePathname()

	// Protect account routes with auth
	if (stateChangedOnce && !currentSession) {
		redirect("/")
	}

	return (
		<>
			<Header />
			<Container>
				<div className="py-8">
					<h1 className="text-3xl font-bold mb-2">Account</h1>
					<p className="text-muted-foreground mb-6">
						Manage your account settings and preferences
					</p>
					<div className="flex flex-col md:flex-row gap-8">
						<aside className="md:w-56 shrink-0">
							<nav className="flex flex-col space-y-1">
								{navItems.map((item) => {
									const isActive = pathname.startsWith(item.href)
									return (
										<Button
											key={item.href}
											variant={isActive ? "default" : "ghost"}
											className="justify-start"
											asChild
										>
											<a href={item.href} className="flex items-center gap-2">
												{item.icon}
												{item.name}
											</a>
										</Button>
									)
								})}
							</nav>
						</aside>
						<Separator className="md:hidden mb-6" />
						<Separator orientation="vertical" className="hidden md:block" />
						<div className="flex-1 md:pl-8">{children}</div>
					</div>
				</div>
			</Container>
		</>
	)
}
