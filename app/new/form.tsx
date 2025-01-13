"use client"

import { Button } from "@/components/ui/button"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { YamlEditor } from "@/components/ui/yaml-editor"
import { createServer } from "@/lib/actions/servers"
import type { RepoConfig } from "@/lib/types/repo-config"
import { RepoConfigSchema } from "@/lib/types/repo-config"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import * as YAML from "yaml"
import * as z from "zod"

const validateYamlConfig = (value: string) => {
	try {
		const parsed = YAML.parse(value)
		const result = RepoConfigSchema.safeParse(parsed)
		return { isValid: true, parsed, result }
	} catch (error) {
		return { isValid: false, error }
	}
}

const normalizeId = (name: string) =>
	name
		.toLowerCase()
		.replace(/[^a-z0-9-_]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")

const projectFormSchema = z.object({
	displayName: z.string().min(1, "Name is required"),
	qualifiedName: z
		.string()
		.min(1, "ID is required")
		.regex(
			/^[a-z]+[a-z0-9-_]+$/,
			"ID must contain only lowercase letters, numbers, hyphens, or underscores, and must start with a letter.",
		),
	description: z.string(),
	config: z
		.string()
		.min(1, "Config is required")
		.transform((value, ctx) => {
			const { isValid, error, result } = validateYamlConfig(value)
			if (!isValid) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Invalid YAML syntax: ${(error as Error).message}`,
				})
				return z.NEVER
			}
			if (!result?.success) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Configuration does not match the required schema",
				})
				return z.NEVER
			}
			return value
		}),
})

function defaultYamlConfig() {
	const defaultConfig: RepoConfig = {
		startCommand: {
			type: "stdio",
			configSchema: {},
			commandFunction: `(config) => (${JSON.stringify(
				{ command: "npx", args: ["."] },
				null,
				2,
			)})`,
		},
	}

	const doc = new YAML.Document(defaultConfig)
	const cmdFuncScalar = doc.getIn(
		["startCommand", "commandFunction"],
		true,
	) as YAML.Scalar
	const schemaScalar = doc.getIn(
		["startCommand", "configSchema"],
		true,
	) as YAML.Scalar

	cmdFuncScalar.commentBefore =
		" A function that produces the CLI command to start the MCP on stdio."
	cmdFuncScalar.type = "BLOCK_LITERAL"
	schemaScalar.commentBefore =
		" JSON Schema defining the configuration options for the MCP."

	const yamlString = doc.toString()
	return yamlString.trim()
}

type ProjectFormData = z.infer<typeof projectFormSchema>

interface Props {
	owner: string | null
	repo: string | null
}
export default function ConfigForm({ owner, repo }: Props) {
	const router = useRouter()

	const form = useForm<ProjectFormData>({
		resolver: zodResolver(projectFormSchema),
		defaultValues: {
			displayName: repo ?? "",
			qualifiedName: repo ? normalizeId(repo) : "",
			description: `Deployed from ${owner}/${repo}`,
			config: defaultYamlConfig(),
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

		// Additional YAML config validation
		if (value.config) {
			const { isValid, error, result } = validateYamlConfig(value.config)
			if (!isValid) {
				if (result && !result.success) {
					form.setError("config", {
						message: `Schema Error: ${JSON.stringify(result.error.errors[0])}`,
					})
				} else {
					form.setError("config", {
						message: `YAML Error: ${(error as Error).message}`,
					})
				}
				return false
			}
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

			const { error } = await createServer({
				...value,
				repoOwner: owner,
				repoName: repo,
			})

			if (error) {
				throw new Error(error)
			}

			router.push(`/project/${value.qualifiedName}`)
		} catch (error) {
			form.setError("root", {
				message:
					error instanceof Error
						? error.message
						: "An unexpected error occurred",
			})
		} finally {
			setIsLoading(false)
		}
	}

	// Combined form watching effects
	useEffect(() => {
		const subscription = watch((value, { name: fieldName }) => {
			if (fieldName === "displayName" && value.displayName) {
				setValue("qualifiedName", normalizeId(value.displayName))
			}

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
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
					<FormField
						control={form.control}
						name="displayName"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Name</FormLabel>
								<FormControl>
									<Input
										placeholder="Project name"
										{...field}
										data-lpignore="true"
										onChange={(e) => {
											field.onChange(e)
											// Auto-update ID when name changes
											const newId = e.target.value
												.toLowerCase()
												.replace(/[^a-z0-9-_]/g, "-")
											form.setValue("qualifiedName", newId)
										}}
									/>
								</FormControl>
								<p className="text-sm text-muted-foreground">
									Display name for your project
								</p>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="qualifiedName"
						render={({ field }) => (
							<FormItem>
								<FormLabel>ID</FormLabel>
								<FormControl>
									<Input
										placeholder="project-id"
										{...field}
										className="font-mono"
									/>
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
									<Input placeholder="Project description" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="config"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Configuration</FormLabel>
								<FormControl>
									<YamlEditor
										value={field.value}
										onChange={field.onChange}
										error={!!form.formState.errors.config}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="space-y-2">
						<p className="text-sm text-muted-foreground mb-4">
							Once you click &quot;Deploy&quot;, we will commit the
							configuration file to the root of your repository&apos;s (default
							branch) and create the project in Smithery.
						</p>
						<Button
							type="submit"
							disabled={
								form.formState.isSubmitting ||
								isLoading ||
								!form.formState.isValid ||
								Object.keys(form.formState.errors).length > 0
							}
						>
							{form.formState.isSubmitting || isLoading
								? "Creating..."
								: "Deploy"}
						</Button>
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
