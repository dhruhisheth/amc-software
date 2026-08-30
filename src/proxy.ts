import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

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
