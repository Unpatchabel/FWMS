import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * Route guard (Edge runtime).
 * Verifies the signed session cookie before allowing access to app pages.
 * `jose` verification works here without Node APIs.
 */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === "/login";

  // The edge guard cannot check DB sessionVersion; let signed cookies reach
  // /login so revoked sessions can sign in again instead of looping through
  // /dashboard -> requireUser() -> /login.

  // Unauthenticated users can only reach the login page.
  if (!session && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

// Apply to all routes except Next internals and static files. (There is no
// /api tree to exempt anymore — every mutation is a Server Action, which
// posts to the page's own route and is protected by the same guard below.)
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
