import { AlertCircle } from "lucide-react"

export default function ErrorMessage({ message }: { message: string }) {
	return (
		<div className="bg-red-50 border-l-4 border-red-400 p-4">
			<div className="flex">
				<div className="flex-shrink-0">
					<AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
				</div>
				<div className="ml-3">
					<p className="text-sm text-red-700">{message}</p>
				</div>
			</div>
		</div>
	)
}
