import { Suspense } from "react"
import type { FetchedServer } from "@/lib/utils/get-server"
import { Installtabs, type InstallTabStates } from "./install-tabs"
// import { prefetchServerConfig } from "./shared/prefetch-schema"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"

type Props = {
	server: FetchedServer
	initTab?: InstallTabStates
	onTabChange?: (tab: InstallTabStates) => void
}

function InstallTabsSkeleton() {
	return (
		<div>
			{/* Mobile Select Skeleton */}
			<div className="lg:hidden mb-3">
				<Skeleton className="h-10 w-[150px]" />
			</div>

			{/* Desktop Tabs Skeleton */}
			<div className="hidden lg:block border-b border-border mb-3">
				<TabsList>
					{/* Show 4 tab skeletons to match visibleCount */}
					{["skeleton-1", "skeleton-2", "skeleton-3", "skeleton-4"].map(
						(id) => (
							<TabsTrigger key={id} value={`tab-${id}`} disabled>
								<div className="flex items-center gap-2">
									<Skeleton className="h-4 w-4 rounded-full" /> {/* Icon */}
									<Skeleton className="h-4 w-16" /> {/* Label */}
								</div>
							</TabsTrigger>
						),
					)}
				</TabsList>
			</div>

			{/* Content Skeleton */}
			<div className="space-y-4">
				<Skeleton className="h-8 w-3/4" /> {/* Title or header */}
				<div className="space-y-2">
					<Skeleton className="h-10 w-full" /> {/* Input or content line */}
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-2/3" />
				</div>
				<Skeleton className="h-12 w-32" /> {/* Button */}
			</div>
		</div>
	)
}

export function ServerInstall({
	server,
	initTab = "claude",
	onTabChange,
}: Props) {
	return (
		<div>
			<h2 className="text-2xl font-bold mb-4">Installation</h2>
			<div className="bg-background p-3 rounded-lg border border-border">
				<Suspense fallback={<InstallTabsSkeleton />}>
					<Installtabs
						server={server}
						initTab={initTab}
						onTabChange={onTabChange}
					/>
				</Suspense>
			</div>
		</div>
	)
}
