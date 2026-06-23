"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/layout/brand-logo";
import { LanguageFooter } from "@/components/layout/language-footer";
import { TopNav } from "@/components/layout/top-nav";
import type { PlatformBrand } from "@/server/platform-settings";

const chromeHiddenRoutes = new Set(["/", "/login", "/cmt-admin/login", "/passer-a-toquetop"]);
const rootHosts = new Set(["toquetop.com", "www.toquetop.com", "localhost", "127.0.0.1"]);
const ignoredSubdomains = new Set(["www", "app", "admin", "api"]);

function isRestaurantSubdomainHost(host: string) {
  const normalizedHost = host.split(":")[0]?.toLowerCase() ?? "";

  if (rootHosts.has(normalizedHost) || !normalizedHost.endsWith(".toquetop.com")) {
    return false;
  }

  const subdomain = normalizedHost.replace(/\.toquetop\.com$/, "");
  return Boolean(subdomain) && !ignoredSubdomains.has(subdomain);
}

export function AppShell({
  brand,
  children,
  initialHost
}: {
  brand: PlatformBrand;
  children: React.ReactNode;
  initialHost: string;
}) {
  const pathname = usePathname();
  const isRestaurantSubdomain = isRestaurantSubdomainHost(initialHost);
  const isRestaurantReservationPage =
    isRestaurantSubdomain && (pathname === "/" || pathname === "/reservation" || pathname.startsWith("/sites/"));
  const routeHidesChrome =
    chromeHiddenRoutes.has(pathname) ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/cmt-admin") ||
    pathname.startsWith("/legal");
  const hideChrome =
    routeHidesChrome && !isRestaurantReservationPage;

  return (
    <div className="flex min-h-screen flex-col">
      {hideChrome ? null : (
        <header className="border-b border-ink/10 bg-white/85 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <Link href="/" className="inline-flex min-w-0 items-center" aria-label="C’est ma table">
              <BrandLogo initialBrand={brand} />
            </Link>
            <TopNav />
          </div>
        </header>
      )}
      <main className="flex-1">{children}</main>
      {hideChrome ? null : <LanguageFooter brand={brand} />}
    </div>
  );
}
