import { type NextRequest, NextResponse } from "next/server"

import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
	const hostname = request.headers.get("host")
	const url = request.nextUrl.clone()

	// Handle registry subdomain
	if (hostname?.startsWith("registry.")) {
		// Rewrite the URL to point to /registry routes
		url.pathname = `/registry${url.pathname}`
		return NextResponse.rewrite(url)
	}

	// Redirect /protocol/... to /server/...
	if (url.pathname.startsWith("/protocol/")) {
		url.pathname = url.pathname.replace("/protocol/", "/server/")
		return NextResponse.redirect(url, { status: 308 })
	}
	await updateSession(request)
	return NextResponse.next()
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * Feel free to modify this pattern to include more paths.
		 */
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
}
