import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

const ROOT_HOSTS = new Set([
  "toquetop.com",
  "www.toquetop.com",
  "dashboard.toquetop.com",
  "localhost",
  "127.0.0.1"
]);
const DASHBOARD_HOSTS = new Set(["dashboard.toquetop.com"]);
const IGNORED_SUBDOMAINS = new Set(["www", "app", "admin", "api", "dashboard"]);
const CACHEABLE_LOGIN_PATHS = new Set(["/login", "/admin/login"]);
const LOGIN_CACHE_CONTROL = "public, max-age=60, s-maxage=300, stale-while-revalidate=600";
const LOGIN_CDN_CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=600";

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

function isDashboardHost(host: string) {
  return DASHBOARD_HOSTS.has(host);
}

function requestHeadersWithPathname(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-toquetop-pathname", request.nextUrl.pathname);
  return requestHeaders;
}

function withLoginCacheHeaders(response: NextResponse, request: NextRequest) {
  if (
    request.method === "GET" &&
    CACHEABLE_LOGIN_PATHS.has(request.nextUrl.pathname) &&
    !request.nextUrl.search
  ) {
    response.headers.set("Cache-Control", LOGIN_CACHE_CONTROL);
    response.headers.set("CDN-Cache-Control", LOGIN_CDN_CACHE_CONTROL);
    response.headers.set("Vercel-CDN-Cache-Control", LOGIN_CDN_CACHE_CONTROL);
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const host = hostWithoutPort(request);
  const requestHeaders = requestHeadersWithPathname(request);

  if (isDashboardHost(host) && (pathname === "/" || pathname === "/login")) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = pathname === "/login" ? "/admin/login" : "/admin";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  if ((pathname === "/admin" || pathname.startsWith("/admin/")) && pathname !== "/admin/login") {
    const token = await getToken({ req: request });

    if (!token) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const subdomain = restaurantSubdomain(host);

  if (subdomain && (pathname === "/" || pathname === "/reservation")) {
    const url = request.nextUrl.clone();
    url.pathname = `/sites/${subdomain}`;
    return withLoginCacheHeaders(
      NextResponse.rewrite(url, {
        request: {
          headers: requestHeaders
        }
      }),
      request
    );
  }

  return withLoginCacheHeaders(
    NextResponse.next({
      request: {
        headers: requestHeaders
      }
    }),
    request
  );
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
