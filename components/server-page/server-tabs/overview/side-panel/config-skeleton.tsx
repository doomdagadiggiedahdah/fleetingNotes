import { Skeleton } from "@/components/ui/skeleton"

export function ConfigSkeleton() {
	return (
		<div className="space-y-2">
			<div className="flex items-baseline gap-2">
				<Skeleton className="h-6 w-32" /> {/* Field name */}
				<Skeleton className="h-4 w-16" /> {/* Required tag */}
			</div>
			<Skeleton className="h-4 w-16 opacity-70" /> {/* Type */}
			<Skeleton className="h-4 w-3/4 opacity-50" /> {/* Description */}
		</div>
	)
}
