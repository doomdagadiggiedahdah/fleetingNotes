import Image from "next/image"

export function Maintainers() {
	return (
		<div className="flex flex-row gap-8">
			<div className="flex flex-col items-center space-y-2">
				<div className="relative w-24 h-24">
					<Image
						src="/profile/henry.png"
						alt="Henry Mao"
						className="rounded-full object-cover"
						fill
						sizes="96px"
					/>
				</div>
				<h3 className="font-medium">Henry Mao</h3>
				<a
					href="https://x.com/calclavia"
					target="_blank"
					rel="noopener noreferrer"
					className="text-blue-500 hover:text-blue-600"
				>
					@calclavia
				</a>
			</div>
			<div className="flex flex-col items-center space-y-2">
				<div className="relative w-24 h-24">
					<Image
						src="/profile/arjun.png"
						alt="Arjun Kumar"
						className="rounded-full object-cover"
						fill
						sizes="96px"
					/>
				</div>
				<h3 className="font-medium">Arjun Kumar</h3>
				<a
					href="https://x.com/arjunkmrm"
					target="_blank"
					rel="noopener noreferrer"
					className="text-blue-500 hover:text-blue-600"
				>
					@arjunkmrm
				</a>
			</div>
		</div>
	)
}
