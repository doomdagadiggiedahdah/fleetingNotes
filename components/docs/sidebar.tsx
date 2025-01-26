import { NavLink } from "./nav-link"

export const navigation = [
	{
		title: "Getting Started",
		links: [
			{ title: "Introduction", href: "/docs" },
			{ title: "Deployments", href: "/docs/deployments" },
			{ title: "Configuration", href: "/docs/config" },
			// { title: "Profiles", href: "/docs/profiles" },
			{ title: "Git Integration", href: "/docs/git" },
		],
	},
]

export default function DocsSidebar() {
	return (
		<nav className="hidden md:block w-64 flex-shrink-0 border-r border-border/40">
			<div className="h-full overflow-y-auto p-8">
				<div className="mb-8">
					<h2 className="px-4 text-lg font-semibold text-foreground">
						Documentation
					</h2>
				</div>
				<div className="space-y-8">
					{navigation.map((section) => (
						<div key={section.title}>
							<h3 className="px-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
								{section.title}
							</h3>
							<div className="mt-3">
								{section.links.map((link) => (
									<NavLink key={link.href} href={link.href}>
										{link.title}
									</NavLink>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		</nav>
	)
}
