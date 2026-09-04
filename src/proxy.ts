import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Areas only an admin may open at all. Everything else is reachable by any signed-in role;
// what a role may *change* there is enforced per action by lib/auth/guards.ts.
const ADMIN_ONLY_PREFIXES = ["/upload", "/settings"];

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAdminRoute = ADMIN_ONLY_PREFIXES.some((prefix) =>
      req.nextUrl.pathname.startsWith(prefix)
    );

    if (isAdminRoute && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
