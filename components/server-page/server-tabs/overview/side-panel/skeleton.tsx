import { Skeleton } from "@/components/ui/skeleton"

export function InstallTabsSkeleton() {
	return (
		<div>
			<h2 className="text-2xl font-bold mb-4">Installation</h2>
			<div className="bg-background p-3 rounded-lg border border-border">
				{/* Four small tabs */}
				<div className="flex mb-3 border-b">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-8 w-24 mr-2 mb-2" />
					))}
				</div>

				{/* Single content block */}
				<div className="space-y-2">
					<Skeleton className="h-24 w-full rounded-md" />
				</div>
			</div>
		</div>
	)
}
