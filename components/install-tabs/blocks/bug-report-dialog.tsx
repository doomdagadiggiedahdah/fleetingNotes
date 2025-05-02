"use client"

import { useState, useEffect } from "react"
import { Bug, ExternalLink } from "lucide-react"
import { FaWindows, FaApple, FaLinux } from "react-icons/fa"
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
import posthog from "posthog-js"
import { CodeBlock as SimpleCodeBlock } from "@/components/docs/simple-code-block"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import type { ClientType } from "@/lib/config/clients"

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

type BugType = "server" | "smithery"
type ConnectionType = "local" | "remote"
type OperatingSystem = "windows" | "mac" | "linux"

interface BugReportForm {
	bugType: BugType
	description: string
	stepsToReproduce: string
	connectionType: ConnectionType
	hasSpecialChars: boolean
	additionalContext: string
	logs: string
	os: OperatingSystem | undefined
	client: ClientType | undefined
}

const CLIENTS: ClientType[] = [
	"claude",
	"cursor",
	"windsurf",
	"cline",
	"witsy",
	"enconvo",
	"goose",
	"spinai",
	"vscode",
]

export function BugReportDialog({
	open,
	onOpenChange,
	serverQualifiedName,
	serverId,
	client,
	connectionType,
	serverRepo,
}: BugReportDialogProps) {
	const detectOS = (): OperatingSystem | undefined => {
		const userAgent = navigator.userAgent.toLowerCase()
		if (userAgent.includes("win")) return "windows"
		if (userAgent.includes("mac")) return "mac"
		if (userAgent.includes("linux")) return "linux"
		return undefined
	}

	const [form, setForm] = useState<BugReportForm>({
		bugType: "smithery",
		description: "",
		stepsToReproduce: "",
		connectionType: connectionType,
		hasSpecialChars: false,
		additionalContext: "",
		logs: "",
		os: detectOS(),
		client: client as ClientType,
	})

	// Track when dialog is opened
	useEffect(() => {
		if (open) {
			posthog.capture("Bug Report", {
				serverQualifiedName,
				serverId,
				bugType: form.bugType,
				client,
				connectionType: form.connectionType,
				os: form.os,
			})
		}
	}, [
		open,
		serverQualifiedName,
		serverId,
		client,
		form.connectionType,
		form.os,
	])

	const handleSubmit = () => {
		// Track the bug report in PostHog
		posthog.capture("Bug Report Submitted", {
			serverQualifiedName,
			serverId,
			bugType: form.bugType,
			connectionType: form.connectionType,
			client: form.client || client,
			os: form.os,
		})

		// Open GitHub issue with pre-filled information
		const title = `[${form.bugType === "server" ? "Server" : "Smithery"} Bug] ${serverQualifiedName}`
		const body = `## Overview
**Client:** ${form.client || client}
**Bug Type:** ${form.bugType === "server" ? "Server" : "Smithery"} Bug
**Server:** ${serverQualifiedName}
**Connection:** ${form.connectionType === "local" ? "Local" : "Remote"}
**OS:** ${form.os ? form.os.charAt(0).toUpperCase() + form.os.slice(1) : ""}${
			form.bugType === "server"
				? `
**Source:** Smithery`
				: ""
		}

## Description
${form.description}

${
	form.stepsToReproduce.trim()
		? `## Steps to Reproduce
${form.stepsToReproduce}

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

				<div className="space-y-4 py-2 flex-1 overflow-y-auto dark-scrollbar px-8 flex flex-col">
					<div className="space-y-1">
						<Label>What type of bug are you reporting?</Label>
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
								<RadioGroupItem value="smithery" id="smithery" />
								<Label htmlFor="smithery">Smithery Bug</Label>
							</div>
							<p className="text-sm text-muted-foreground pl-6 -mt-0.5">
								Smithery installation or connection has an issue (e.g.,
								can&apos;t connect, installation fails)
							</p>
						</RadioGroup>
					</div>

					<div className="space-y-1">
						<Label>Operating System</Label>
						<RadioGroup
							value={form.os}
							onValueChange={(value: string) =>
								setForm({ ...form, os: value as OperatingSystem })
							}
							className="grid gap-1"
						>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="windows" id="windows" />
								<Label htmlFor="windows" className="flex items-center gap-2">
									<FaWindows className="w-4 h-4" />
									Windows
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="mac" id="mac" />
								<Label htmlFor="mac" className="flex items-center gap-2">
									<FaApple className="w-4 h-4" />
									macOS
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="linux" id="linux" />
								<Label htmlFor="linux" className="flex items-center gap-2">
									<FaLinux className="w-4 h-4" />
									Linux
								</Label>
							</div>
						</RadioGroup>
					</div>

					<div className="space-y-1">
						<Label>Client</Label>
						<Select
							value={form.client}
							onValueChange={(value) =>
								setForm({ ...form, client: value as ClientType })
							}
						>
							<SelectTrigger className="w-[200px]">
								<SelectValue placeholder="Select a client" />
							</SelectTrigger>
							<SelectContent>
								{CLIENTS.map((client) => (
									<SelectItem
										key={client}
										value={client}
										className="hover:bg-accent hover:text-accent-foreground cursor-pointer"
									>
										{client.charAt(0).toUpperCase() + client.slice(1)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Describe the bug</Label>
						<Textarea
							id="description"
							value={form.description}
							onChange={(e) =>
								setForm({ ...form, description: e.target.value })
							}
							placeholder="What happened? What did you expect to happen?"
							className="min-h-[120px] dark-scrollbar flex-1"
						/>
					</div>

					<div className="space-y-2">
						<Label>Steps to Reproduce</Label>
						<Textarea
							value={form.stepsToReproduce}
							onChange={(e) =>
								setForm({ ...form, stepsToReproduce: e.target.value })
							}
							placeholder={`1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error`}
							className="min-h-[160px] dark-scrollbar flex-1"
						/>
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
							className="min-h-[200px] font-mono text-sm dark-scrollbar flex-1"
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
							className="min-h-[120px] dark-scrollbar flex-1"
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
					<Button onClick={handleSubmit} className="gap-2">
						Submit to Github
						<ExternalLink className="h-4 w-4" />
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
