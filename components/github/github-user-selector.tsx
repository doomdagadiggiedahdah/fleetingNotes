"use client"
import { openGithubAppInstall } from "@/lib/auth/github/client"
import type { GithubAccount, GithubUser } from "@/lib/auth/github/common"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { ChevronDownIcon } from "@radix-ui/react-icons"
import { Plus, RefreshCw } from "lucide-react"
import { useContext, useState } from "react"
import { GithubUserContext } from "./github-user-provider"

interface GithubUserHeaderProps {
	user: GithubUser
	selectedAccount: GithubAccount | null
	onOwnerChange: (owner: GithubAccount) => void
}

export function GithubUserSelector({
	user,
	selectedAccount,
	onOwnerChange,
}: GithubUserHeaderProps) {
	const { signIn } = useContext(GithubUserContext)
	const [isRefreshing, setIsRefreshing] = useState(false)
	const [hasAttemptedAddAccount, setHasAttemptedAddAccount] = useState(false)

	const handleRefresh = async () => {
		setIsRefreshing(true)
		try {
			await signIn()
		} finally {
			setIsRefreshing(false)
		}
	}

	const handleAddAccount = () => {
		setHasAttemptedAddAccount(true)
		openGithubAppInstall()
	}

	if (!selectedAccount)
		return (
			<DropdownMenu.Root>
				<DropdownMenu.Trigger asChild>
					<button
						type="button"
						className="flex items-center gap-2 rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-white"
					>
						Select Account
						<ChevronDownIcon className="h-4 w-4" />
					</button>
				</DropdownMenu.Trigger>

				<DropdownMenu.Portal>
					<DropdownMenu.Content
						className="min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-lg border border-neutral-800 bg-neutral-900 p-1"
						sideOffset={5}
						align="start"
					>
						<DropdownMenu.Item
							className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-white outline-none hover:bg-neutral-800"
							onClick={handleAddAccount}
						>
							<Plus className="h-4 w-4" />
							Add Github Account
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Portal>
			</DropdownMenu.Root>
		)

	return (
		<div className="flex items-center gap-2">
			{hasAttemptedAddAccount && (
				<button
					type="button"
					className="flex items-center justify-center rounded-md bg-neutral-800 p-2.5 text-sm text-white hover:bg-neutral-700"
					onClick={handleRefresh}
					disabled={isRefreshing}
					title="Refresh GitHub user after installation"
				>
					<RefreshCw
						className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
					/>
				</button>
			)}
			<DropdownMenu.Root>
				<DropdownMenu.Trigger asChild>
					<button
						type="button"
						className="flex items-center gap-2 rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-white"
					>
						<img
							src={selectedAccount.avatar_url}
							alt={selectedAccount.login}
							className="h-6 w-6 rounded-full"
						/>
						{selectedAccount.login}
						<ChevronDownIcon className="h-4 w-4" />
					</button>
				</DropdownMenu.Trigger>

				<DropdownMenu.Portal>
					<DropdownMenu.Content
						className="min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-lg border border-neutral-800 bg-neutral-900 p-1"
						sideOffset={5}
						align="start"
					>
						{user.accounts
							.filter((acc) => acc.login !== selectedAccount.login)
							.map((acc) => (
								<DropdownMenu.Item
									key={acc.login}
									className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-white outline-none hover:bg-neutral-800"
									onClick={() => onOwnerChange(acc)}
								>
									<img
										src={acc.avatar_url}
										alt={acc.name || acc.login}
										className="h-5 w-5 rounded-full"
									/>
									{acc.name || acc.login}
								</DropdownMenu.Item>
							))}

						<DropdownMenu.Item
							className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-white outline-none hover:bg-neutral-800"
							onClick={handleAddAccount}
						>
							<Plus className="h-4 w-4" />
							Add Github Account
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Portal>
			</DropdownMenu.Root>
		</div>
	)
}
