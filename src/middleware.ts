import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

const ROOT_HOSTS = new Set(["toquetop.com", "www.toquetop.com", "localhost", "127.0.0.1"]);
const IGNORED_SUBDOMAINS = new Set(["www", "app", "admin", "api"]);

function hostWithoutPort(request: NextRequest) {
  return (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
}

function restaurantSubdomain(host: string) {
  if (ROOT_HOSTS.has(host) || !host.endsWith(".toquetop.com")) {
    return undefined;
  }

  const subdomain = host.replace(/\.toquetop\.com$/, "");

  return subdomain && !IGNORED_SUBDOMAINS.has(subdomain) ? subdomain : undefined;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/admin")) {
    const token = await getToken({ req: request });
    const role = token?.role;

    if (role !== "ADMIN" && role !== "STAFF") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  const subdomain = restaurantSubdomain(hostWithoutPort(request));

  if (subdomain && (pathname === "/" || pathname === "/reservation")) {
    const url = request.nextUrl.clone();
    url.pathname = `/sites/${subdomain}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
