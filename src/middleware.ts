import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public API endpoints
  const publicApiPaths = [
    "/api/auth/register",
    "/api/auth/register-athlete",
    "/api/auth/login", 
    "/api/events" // Public endpoint for homepage
  ];
  
  // Allow GET requests to specific event details
  if (pathname.startsWith("/api/events/") && request.method === "GET") {
    return NextResponse.next();
  }

  // Allow authenticated access to vehicles and user profile endpoints
  if (pathname.startsWith("/api/vehicles") || pathname.startsWith("/api/users/")) {
    const userData = request.cookies.get("user");
    if (userData) {
      return NextResponse.next();
    }
  }
  
  if (publicApiPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // Check for user login status for protected routes
  if (pathname.startsWith("/dashboard") || (pathname.startsWith("/api") && !pathname.startsWith("/api/auth"))) {
    const userData = request.cookies.get("user");

    if (!userData) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
}; 