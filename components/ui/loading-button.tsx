import { Loader2 } from "lucide-react"

import { Button, type ButtonProps } from "@/components/ui/button"

interface Props extends ButtonProps {
	isLoading: boolean
	children: React.ReactNode
}

/**
 * Button with loading spinner
 * @param param0
 * @returns
 */
export function ButtonLoading({ isLoading, children, ...props }: Props) {
	return (
		<Button disabled={isLoading || props.disabled} {...props}>
			{isLoading && <Loader2 className="animate-spin" />}
			{children}
		</Button>
	)
}
