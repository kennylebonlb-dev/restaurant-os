"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/layout/brand-logo";
import { LanguageFooter } from "@/components/layout/language-footer";
import { TopNav } from "@/components/layout/top-nav";
import type { PlatformBrand } from "@/server/platform-settings";

const chromeHiddenRoutes = new Set(["/login", "/cmt-admin/login"]);

export function AppShell({
  brand,
  children
}: {
  brand: PlatformBrand;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideChrome = chromeHiddenRoutes.has(pathname);

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
