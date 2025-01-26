"use client"

import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { ButtonLoading } from "@/components/ui/loading-button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { updateServerDetails } from "@/lib/actions/servers"
import {
	type UpdateServer,
	updateServerSchema,
} from "@/lib/actions/servers.schema"
import type { FetchedServer } from "@/lib/utils/get-server"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { RepoIntegration } from "./repo-integration"
import { Card, CardContent } from "@/components/ui/card"
import { CodeBlock } from "@/components/docs/code-block"

interface SettingsPanelProps {
	server: FetchedServer
}

export function SettingsPanel({ server }: SettingsPanelProps) {
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(false)
	const form = useForm<UpdateServer>({
		resolver: zodResolver(updateServerSchema),
		defaultValues: {
			displayName: server.displayName,
			description: server.description,
			homepage: server.homepage ?? undefined,
			local: !server.remote,
		},
	})

	const onSubmit = async (data: UpdateServer) => {
		try {
			setIsLoading(true)
			const result = await updateServerDetails(server.id, data)
			if (!result.ok) {
				form.setError("root", {
					type: "manual",
					message: result.error,
				})
				return
			}
			router.refresh()
		} catch (error) {
			console.error("Failed to update server:", error)
			form.setError("root", {
				type: "manual",
				message: `Failed to update server.`,
			})
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="my-8 max-w-2xl space-y-12">
			<div>
				<h3 className="text-lg font-medium mb-4">Server Settings</h3>
				<Card>
					<CardContent className="space-y-4 pt-4">
						<Form {...form}>
							<form
								onSubmit={form.handleSubmit(onSubmit)}
								className="space-y-6"
							>
								<FormField
									control={form.control}
									name="displayName"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Name</FormLabel>
											<FormControl>
												<Input {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="description"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Description</FormLabel>
											<FormControl>
												<Textarea {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="homepage"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Homepage</FormLabel>
											<FormControl>
												<Input {...field} placeholder="https://smithery.ai" />
											</FormControl>
											<FormDescription>
												The URL where users can find more information about this
												server
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="local"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center space-x-3 space-y-0">
											<FormControl>
												<Checkbox
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
											<div className="leading-none space-y-1">
												<FormLabel>Local Only</FormLabel>
												<FormDescription>
													Enable this if your MCP requires local access (i.e.,
													end-user file system access).
												</FormDescription>
											</div>
										</FormItem>
									)}
								/>

								{form.formState.errors.root && (
									<p className="text-sm text-red-500">
										{form.formState.errors.root.message}
									</p>
								)}

								<ButtonLoading type="submit" isLoading={isLoading}>
									Save
								</ButtonLoading>
							</form>
						</Form>
					</CardContent>
				</Card>
			</div>
			<div>
				<h3 className="text-lg font-medium mb-4">GitHub Integration</h3>
				<div className="space-y-4">
					<RepoIntegration server={server} />
				</div>
			</div>

			<BadgeContent server={server} />
		</div>
	)
}

export const BadgeContent = ({ server }: { server: FetchedServer }) => {
	return (
		<div>
			<h3 className="text-lg font-medium mb-4">GitHub Badge</h3>
			<Card>
				<CardContent className="space-y-4 pt-4">
					<p className="my-2">
						To show a download counter, add this badge to your README:
					</p>
					<img
						src={`/badge/${server.qualifiedName}`}
						alt="Smithery Badge"
						className="mb-4"
					/>
					<CodeBlock className="language-markdown" lineCount={2}>
						{`[![smithery badge](https://smithery.ai/badge/${server.qualifiedName})](https://smithery.ai/server/${server.qualifiedName})`}
					</CodeBlock>
				</CardContent>
			</Card>
		</div>
	)
}
