export default function NotFound() {
	return (
		<div className="min-h-screen bg-background">
			<main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
				<div className="text-center">
					<h2 className="text-4xl font-bold text-foreground mb-4">
						Page Not Found
					</h2>
					<p className="text-lg text-muted-foreground mb-8">
						Sorry, we couldn&apos;t find the page you&apos;re looking for.
					</p>
				</div>
			</main>
		</div>
	)
}
