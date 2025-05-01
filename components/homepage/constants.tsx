import { Globe, Laptop2, Shield } from "lucide-react"
import React from "react"

interface FilterOption {
	label: string
	value: string
	description: string
	icon: React.ReactElement
}

export const FILTER_OPTIONS: FilterOption[] = [
	{
		label: "Local",
		value: "is:local",
		description: "Servers running on your machine",
		icon: <Laptop2 className="h-4 w-4 text-muted-foreground" />,
	},
	{
		label: "Remote",
		value: "is:remote",
		description: "Servers hosted by smithery",
		icon: <Globe className="h-4 w-4 text-muted-foreground" />,
	},
	{
		label: "Verified",
		value: "is:verified",
		description: "Verified and trusted servers",
		icon: <Shield className="h-4 w-4 text-muted-foreground" />,
	},
] as const

export type { FilterOption }
