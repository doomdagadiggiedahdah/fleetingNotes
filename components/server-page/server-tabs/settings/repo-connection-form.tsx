"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import type { ServerRepo } from "@/db/schema/servers"
import { useToast } from "@/lib/hooks/use-toast"
import { updateRepoConnection } from "@/lib/actions/servers"
import { updateRepoConnectionSchema } from "@/lib/actions/servers.schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import type { z } from "zod"
import { RepoSwitchDialog } from "./repo-switch-dialog"

type FormData = z.infer<typeof updateRepoConnectionSchema>

interface Props {
	serverId: string
	serverRepo: ServerRepo
}

export function RepoConnectionForm({ serverId, serverRepo }: Props) {
	const { toast } = useToast()
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
	const [optimisticRepo, setOptimisticRepo] = useState<{
		owner: string
		name: string
	} | null>(null)
	const router = useRouter()

	/* Optmistic UI update during repo switch */
	const displayRepo = optimisticRepo || {
		owner: serverRepo.repoOwner,
		name: serverRepo.repoName,
	}

	const form = useForm<FormData>({
		resolver: zodResolver(updateRepoConnectionSchema),
		defaultValues: {
			baseDirectory: serverRepo.baseDirectory,
			branch: serverRepo.branch || "",
		},
	})

	const onSubmit = async (data: FormData) => {
		setIsSubmitting(true)
		try {
			const result = await updateRepoConnection(serverId, data)
			if (result.error) {
				toast({
					title: "Error",
					description: result.error,
					variant: "destructive",
				})
			} else {
				toast({
					title: "Success",
					description: "Repository settings updated successfully",
				})
				router.refresh()
			}
		} catch (error) {
			console.error(error)
			toast({
				title: "Error",
				description: "Failed to update repository settings",
				variant: "destructive",
			})
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<>
			<Card>
				<CardContent className="space-y-6 pt-4">
					{/* Repository Connection Section */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="space-y-1.5">
								<h3 className="font-medium">Repository Connection</h3>
								<div className="flex items-center gap-2">
									<p className="text-sm text-muted-foreground">
										Deploying from
									</p>
									<code className="rounded bg-muted px-2 py-1 text-sm">
										{displayRepo.owner}/{displayRepo.name}
									</code>
								</div>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setIsUpdateDialogOpen(true)}
							>
								Switch Repository
							</Button>
						</div>
					</div>

					{/* Repository Settings Section */}
					<div className="space-y-4">
						<div>
							<h3 className="font-medium mb-1.5">Repository Settings</h3>
							<div className="space-y-4">
								<div>
									<h4 className="text-sm font-medium mb-1">Base Directory</h4>
									<p className="text-sm text-muted-foreground">
										The directory containing your Dockerfile and smithery.yaml
										files
									</p>
								</div>
								<div>
									<h4 className="text-sm font-medium mb-1">Branch</h4>
									<p className="text-sm text-muted-foreground">
										Specify which branch to deploy from (optional)
									</p>
								</div>
							</div>
						</div>

						<Form {...form}>
							<form
								onSubmit={form.handleSubmit(onSubmit)}
								className="space-y-4"
							>
								<div className="space-y-4">
									<FormField
										control={form.control}
										name="baseDirectory"
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<Input placeholder="." {...field} />
												</FormControl>
												<FormMessage />
												<p className="text-xs text-muted-foreground">
													Use &quot;.&quot; for root directory
												</p>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="branch"
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<Input placeholder="main" {...field} />
												</FormControl>
												<FormMessage />
												<p className="text-xs text-muted-foreground">
													Leave empty to use the default branch
												</p>
											</FormItem>
										)}
									/>
								</div>
								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting ? "Saving..." : "Save Repository Settings"}
								</Button>
							</form>
						</Form>
					</div>
				</CardContent>
			</Card>

			<RepoSwitchDialog
				isOpen={isUpdateDialogOpen}
				onClose={() => setIsUpdateDialogOpen(false)}
				serverId={serverId}
				currentRepo={{
					owner: serverRepo.repoOwner,
					name: serverRepo.repoName,
				}}
				onRepoSelect={(owner, name) => {
					setOptimisticRepo({ owner, name })
				}}
			/>
		</>
	)
}
