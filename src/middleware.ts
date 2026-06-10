import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(request) {
    const role = request.nextauth.token?.role;

    if (
      request.nextUrl.pathname.startsWith("/admin") &&
      role !== "ADMIN" &&
      role !== "STAFF"
    ) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => Boolean(token)
    }
  }
);

export const config = {
  matcher: ["/admin/:path*", "/my-reservations/:path*"]
};
