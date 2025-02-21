import { NavLink } from "./nav-link"

export const navigation = [
	{
		title: "Getting Started",
		links: [
			{ title: "Introduction", href: "/docs" },
			{ title: "Registry", href: "/docs/registry" },
			{ title: "Deployments", href: "/docs/deployments" },
			{ title: "Configuration", href: "/docs/config" },
			// { title: "Profiles", href: "/docs/profiles" },
			{ title: "Git Integration", href: "/docs/git" },
			{ title: "Data Policy", href: "/docs/data-policy" },
			{ 
				title: "FAQ",
				links: [
					{ title: "Users", href: "/docs/faq/users" },
					{ title: "Developers", href: "/docs/faq/developers" }
				]
			},
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
									<div key={link.href || link.title}>
										{link.href ? (
											<NavLink href={link.href}>
												{link.title}
											</NavLink>
										) : (
											<div className="px-4 py-2 text-sm text-muted-foreground">
												{link.title}
											</div>
										)}
										{link.links && (
											<div className="ml-4 mt-2">
												{link.links.map((subLink) => (
													<NavLink
														key={subLink.href}
														href={subLink.href}
													>
														{subLink.title}
													</NavLink>
												))}
											</div>
										)}
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		</nav>
	)
}
