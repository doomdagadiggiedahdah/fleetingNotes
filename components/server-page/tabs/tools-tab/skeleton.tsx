export function ToolsPanelSkeleton() {
	return (
		<div className="w-1/2">
			<div className="space-y-4">
				{[1, 2, 3].map((i) => (
					<div
						key={i}
						className="rounded-lg border border-border p-4 space-y-3"
					>
						<div className="flex items-center justify-between">
							<div className="h-6 w-1/4 bg-muted animate-pulse rounded" />
							<div className="h-6 w-20 bg-muted animate-pulse rounded" />
						</div>
						<div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
						<div className="space-y-2">
							<div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
							<div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
