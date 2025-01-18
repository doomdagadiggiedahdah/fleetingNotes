"use client"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { ButtonLoading } from "@/components/ui/loading-button"
import { createServer } from "@/lib/actions/servers"
import { createServerSchema } from "@/lib/actions/servers.schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import posthog from "posthog-js"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import type * as z from "zod"

const normalizeId = (name: string) =>
	name
		.toLowerCase()
		.replace(/[^a-z0-9-_]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")

const projectFormSchema = createServerSchema.pick({
	qualifiedName: true,
	baseDirectory: true,
})

type ProjectFormData = z.infer<typeof projectFormSchema>

interface Props {
	owner: string | null
	repo: string | null
}
export default function NewServerForm({ owner, repo }: Props) {
	const router = useRouter()

	const form = useForm<ProjectFormData>({
		resolver: zodResolver(projectFormSchema),
		defaultValues: {
			qualifiedName: repo ? normalizeId(repo) : "",
			baseDirectory: ".",
		},
	})

	const { watch, setValue } = form

	const validateFormData = (value: ProjectFormData) => {
		// Clear all previous errors first
		form.clearErrors()

		// Validate the entire form data
		const formValidation = projectFormSchema.safeParse(value)
		if (!formValidation.success) {
			// Set form errors for each field that failed validation
			formValidation.error.errors.forEach((error) => {
				form.setError(error.path[0] as keyof ProjectFormData, {
					message: error.message,
				})
			})
			return false
		}

		return true
	}

	const onSubmit = async (value: ProjectFormData) => {
		try {
			if (!validateFormData(value)) {
				return
			}

			if (!owner || !repo) {
				throw new Error("Missing repository information")
			}

			// If all validation passes, proceed with form submission
			setIsLoading(true)

			const { server, error } = await createServer({
				...value,
				repoOwner: owner,
				repoName: repo,
			})

			if (error || !server) {
				throw new Error(error)
			}

			posthog.capture("Server Created", {
				...value,
				repoOwner: owner,
				repoName: repo,
			})

			router.push(`/server/${server.qualifiedName}`)

			// Don't set loading false because we're redirecting
		} catch (error) {
			form.setError("root", {
				message:
					error instanceof Error
						? error.message
						: "An unexpected error occurred",
			})
			setIsLoading(false)
		}
	}

	useEffect(() => {
		const subscription = watch((value) => {
			// Validate
			if (value) {
				validateFormData(value as ProjectFormData)
			}
		})
		return () => subscription.unsubscribe()
	}, [watch, setValue])

	const [isLoading, setIsLoading] = useState(false)

	return (
		<>
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="space-y-8 max-w-lg"
				>
					<FormField
						control={form.control}
						name="qualifiedName"
						render={({ field }) => (
							<FormItem>
								<FormLabel>ID</FormLabel>
								<FormControl>
									<div className="flex">
										<div className="bg-[#1C1C1C] px-3 flex items-center text-sm text-muted-foreground rounded-l-md border border-r-0 border-input text-nowrap">
											@{owner} /
										</div>
										<Input
											placeholder="project-id"
											{...field}
											className="font-mono rounded-l-none focus:ring-offset-0"
										/>
									</div>
								</FormControl>
								<p className="text-sm text-muted-foreground">
									Unique ID for your project (a package name identifer).
								</p>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="baseDirectory"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Base Directory</FormLabel>
								<FormControl>
									<Input {...field} />
								</FormControl>
								<p className="text-sm text-muted-foreground">
									The directory your project is located within your repository.
									This is usually the directory containing your Dockerfile,
									package.json or pyproject.toml. Use &quot;.&quot; for the root
									directory.
								</p>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="space-y-2">
						<p className="text-sm text-muted-foreground mb-4">
							Once you click &quot;Create&quot;, your repository will be
							publicly listed on Smithery.
						</p>
						<ButtonLoading
							type="submit"
							isLoading={form.formState.isSubmitting || isLoading}
							disabled={
								form.formState.isSubmitting ||
								isLoading ||
								!form.formState.isValid ||
								Object.keys(form.formState.errors).length > 0
							}
						>
							{form.formState.isSubmitting || isLoading
								? "Creating..."
								: "Create"}
						</ButtonLoading>
					</div>

					{form.formState.errors.root && (
						<p className="text-sm font-medium text-destructive">
							{form.formState.errors.root.message}
						</p>
					)}
				</form>
			</Form>
		</>
	)
}
