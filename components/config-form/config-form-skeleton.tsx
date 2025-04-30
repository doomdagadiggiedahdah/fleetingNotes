import { Skeleton } from "@/components/ui/skeleton"

export function ConfigFormSkeleton() {
	return (
		<div className="space-y-6">
			{/* Title */}
			<Skeleton className="h-6 w-1/3 mb-2" />
			{/* Fields */}
			<div className="space-y-4">
				<Skeleton className="h-4 w-1/2" />
				<Skeleton className="h-4 w-1/2" />
				<Skeleton className="h-10 w-full" />
			</div>
			{/* Error message area */}
			<Skeleton className="h-4 w-1/4" />
			{/* Buttons */}
			<div className="flex gap-4 mt-4">
				<Skeleton className="h-9 w-24 rounded-md" />
				<Skeleton className="h-9 w-32 rounded-md" />
			</div>
		</div>
	)
}
