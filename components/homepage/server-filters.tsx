"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "../ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { Check, SlidersHorizontal, X } from "lucide-react"
import { FILTER_OPTIONS } from "@/components/homepage/constants"

export function ServerFilters() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const currentQuery = searchParams.get("q") || ""

	// Extract the base query (without filter) and current filter
	const baseQuery = currentQuery.replace(/\s*(is|has):\w+/, "").trim()
	const currentFilter =
		FILTER_OPTIONS.find((option) => currentQuery.includes(option.value))
			?.value || ""

	const handleFilterChange = (value: string) => {
		const newQuery = [baseQuery, value].filter(Boolean).join(" ")
		const params = new URLSearchParams(searchParams.toString())
		params.set("q", newQuery)
		router.push(`?${params.toString()}`)
	}

	const clearFilter = () => {
		const params = new URLSearchParams(searchParams.toString())
		params.set("q", baseQuery)
		router.push(`?${params.toString()}`)
	}

	return (
		<div className="flex items-center gap-2">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="outline"
						className="rounded-full px-4 h-[40px] border-[1.5px] hover:bg-secondary/80 bg-background text-base"
					>
						<SlidersHorizontal className="h-7 w-7 mr-2" />
						Filter
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-[280px]">
					<DropdownMenuLabel className="text-sm font-medium">
						Filter Servers
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<div className="p-2">
						{FILTER_OPTIONS.map((option) => (
							<button
								key={option.value}
								type="button"
								className={`
                  w-full flex items-start justify-between p-2 rounded-md cursor-pointer text-left
                  ${currentFilter === option.value ? "bg-secondary" : "hover:bg-secondary/50"}
                `}
								onClick={() => handleFilterChange(option.value)}
								role="menuitem"
							>
								<div className="space-y-1">
									<p className="text-sm font-medium leading-none">
										{option.label}
									</p>
									<p className="text-sm text-muted-foreground">
										{option.description}
									</p>
								</div>
								{currentFilter === option.value && (
									<Check className="h-4 w-4 text-primary" />
								)}
							</button>
						))}
					</div>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Active Filter Chip */}
			{currentFilter && (
				<div className="flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm">
					{FILTER_OPTIONS.find((opt) => opt.value === currentFilter)?.label}
					<button
						onClick={clearFilter}
						className="ml-1 hover:text-primary"
						aria-label="Clear filter"
					>
						<X className="h-3 w-3" />
					</button>
				</div>
			)}
		</div>
	)
}
