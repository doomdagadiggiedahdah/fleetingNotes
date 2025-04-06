"use client"

import { useState, useEffect } from "react"
import { Bug, ExternalLink, Plus, X } from "lucide-react"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import posthog from "posthog-js"
import { CodeBlock as SimpleCodeBlock } from "@/components/docs/simple-code-block"

interface BugReportDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	serverQualifiedName: string
	serverId: string
	client: string
	connectionType: "local" | "remote"
	serverRepo: {
		owner: string
		repo: string
	}
}

type BugType = "server" | "installation"
type ConnectionType = "local" | "remote"

interface BugReportForm {
	bugType: BugType
	description: string
	stepsToReproduce: string[]
	connectionType: ConnectionType
	hasSpecialChars: boolean
	additionalContext: string
	logs: string
}

export function BugReportDialog({
	open,
	onOpenChange,
	serverQualifiedName,
	serverId,
	client,
	connectionType,
	serverRepo,
}: BugReportDialogProps) {
	const [form, setForm] = useState<BugReportForm>({
		bugType: "server",
		description: "",
		stepsToReproduce: ["", "", ""],
		connectionType: connectionType,
		hasSpecialChars: false,
		additionalContext: "",
		logs: "",
	})

	// Track when dialog is opened
	useEffect(() => {
		if (open) {
			posthog.capture("Bug Report", {
				serverQualifiedName,
				serverId,
				client,
				connectionType: form.connectionType,
				eventTag: "bug_report_click",
			})
		}
	}, [open, serverQualifiedName, serverId, client, form.connectionType])

	const handleSubmit = () => {
		// Track the bug report in PostHog
		posthog.capture("Bug Report", {
			serverQualifiedName,
			serverId,
			bugType: form.bugType,
			connectionType: form.connectionType,
			client,
			eventTag: "bug_report_submit",
		})

		// Open GitHub issue with pre-filled information
		const title = `[${form.bugType === "server" ? "Server" : "MCP Installation"} Bug] ${serverQualifiedName}`
		const body = `## Overview
**Client:** ${client}
**Bug Type:** ${form.bugType === "server" ? "Server" : "Installation"} Bug
**Server:** ${serverQualifiedName}
**Connection:** ${form.connectionType === "local" ? "Local" : "Remote"}${
			form.bugType === "server"
				? `
**Source:** Smithery`
				: ""
		}

## Description
${form.description}

${
	form.stepsToReproduce.filter((step) => step.trim()).length > 0
		? `## Steps to Reproduce
${form.stepsToReproduce
	.filter((step) => step.trim())
	.map((step, i) => `${i + 1}. ${step}`)
	.join("\n")}

`
		: ""
}${
	form.logs.trim()
		? `## Logs
\`\`\`
${form.logs}
\`\`\`

`
		: ""
}${
	form.additionalContext.trim()
		? `## Additional Context
${form.additionalContext}

`
		: ""
}## Screenshots
*Screenshots can be added by dragging and dropping them here.*`

		// Open in either server repo or CLI repo based on bug type
		const repoUrl =
			form.bugType === "server"
				? `https://github.com/${serverRepo.owner}/${serverRepo.repo}`
				: "https://github.com/smithery-ai/cli"

		const assigneesParam =
			form.bugType === "server" ? "" : "&assignees=arjunkmrm"

		window.open(
			`${repoUrl}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}${assigneesParam}`,
			"_blank",
		)
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Bug className="h-5 w-5" />
						Report a Bug for {serverQualifiedName}
					</DialogTitle>
					<DialogDescription>
						Help us improve by reporting any issues you encounter.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2 flex-1 overflow-y-auto dark-scrollbar px-8">
					<div className="space-y-1">
						<Label>
							What type of bug are you reporting?{" "}
							<span className="text-destructive">*</span>
						</Label>
						<RadioGroup
							value={form.bugType}
							onValueChange={(value: string) =>
								setForm({ ...form, bugType: value as BugType })
							}
							className="grid gap-1"
						>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="server" id="server" />
								<Label htmlFor="server">Server Bug</Label>
							</div>
							<p className="text-sm text-muted-foreground pl-6 -mt-0.5">
								The server has an issue (e.g., incorrect responses, crashes,
								security concerns)
							</p>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="installation" id="installation" />
								<Label htmlFor="installation">Installation Bug</Label>
							</div>
							<p className="text-sm text-muted-foreground pl-6 -mt-0.5">
								Smithery installation or connection has an issue (e.g.,
								can&apos;t connect, installation fails)
							</p>
						</RadioGroup>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">
							Describe the bug <span className="text-destructive">*</span>
						</Label>
						<Textarea
							id="description"
							value={form.description}
							onChange={(e) =>
								setForm({ ...form, description: e.target.value })
							}
							placeholder="What happened? What did you expect to happen?"
							className="min-h-[80px] dark-scrollbar"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label>Steps to Reproduce</Label>
						<div className="space-y-2">
							{form.stepsToReproduce.map((step, index) => (
								<div
									key={`step-${index}-${step}`}
									className="flex items-center gap-2"
								>
									<span className="text-sm text-muted-foreground min-w-[1.5rem]">
										{index + 1}.
									</span>
									<Input
										value={step}
										onChange={(e) => {
											const newSteps = [...form.stepsToReproduce]
											newSteps[index] = e.target.value
											setForm({ ...form, stepsToReproduce: newSteps })
										}}
										placeholder={`Step ${index + 1}`}
									/>
									{form.stepsToReproduce.length > 1 && (
										<button
											onClick={() => {
												const newSteps = [...form.stepsToReproduce]
												newSteps.splice(index, 1)
												setForm({ ...form, stepsToReproduce: newSteps })
											}}
											className="text-muted-foreground hover:text-destructive transition-colors"
										>
											<X className="h-4 w-4" />
										</button>
									)}
								</div>
							))}
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="mt-2"
								onClick={() =>
									setForm({
										...form,
										stepsToReproduce: [...form.stepsToReproduce, ""],
									})
								}
							>
								<Plus className="h-4 w-4 mr-2" />
								Add Step
							</Button>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="logs">Server Logs (highly recommended)</Label>
						<div className="space-y-1 text-sm text-muted-foreground mb-2">
							<p>Please run and paste the output of the inspect command:</p>
						</div>
						<SimpleCodeBlock
							code={`npx -y @smithery/cli@latest inspect ${serverQualifiedName} --verbose`}
							showHeader={true}
							headerLabel="terminal"
							className="mb-2"
						/>
						<Textarea
							id="logs"
							value={form.logs}
							onChange={(e) => setForm({ ...form, logs: e.target.value })}
							placeholder="Paste the inspect command output here"
							className="min-h-[200px] font-mono text-sm dark-scrollbar"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="additional">Additional Context</Label>
						<Textarea
							id="additional"
							value={form.additionalContext}
							onChange={(e) =>
								setForm({ ...form, additionalContext: e.target.value })
							}
							placeholder="Any other relevant information"
							className="min-h-[80px] dark-scrollbar"
						/>
					</div>

					<div className="space-y-2">
						<Label>Screenshots</Label>
						<p className="text-sm text-muted-foreground">
							You&apos;ll be able to add screenshots directly in GitHub after
							submitting the issue.
						</p>
					</div>
				</div>

				<DialogFooter className="sticky bottom-0 bg-background border-t pt-4">
					<Button
						onClick={handleSubmit}
						className="gap-2"
						disabled={!form.description.trim() || !form.bugType}
					>
						Submit on GitHub
						<ExternalLink className="h-4 w-4" />
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
