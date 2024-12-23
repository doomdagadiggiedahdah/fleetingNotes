import { type NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
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

	return NextResponse.next()
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
}
