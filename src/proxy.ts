import { NextResponse, type NextRequest } from "next/server";

// Runs before protected pages render. It only checks that a session cookie
// exists, which is cheap and needs no database, so signed-out visitors are
// redirected before any work happens. It is NOT the security boundary:
// every page and API route still validates the session against the database.

const SESSION_COOKIE = "equilibria_session";

export function proxy(req: NextRequest) {
  if (req.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const login = new URL("/login", req.url);
  login.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/calendar/:path*",
    "/cycles/:path*",
    "/logs/:path*",
    "/insights/:path*",
    "/meals/:path*",
    "/board/:path*",
  ],
};
