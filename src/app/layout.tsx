import type { Metadata } from "next";
import Link from "next/link";
import { Providers } from "@/app/providers";
import { BrandLogo } from "@/components/layout/brand-logo";
import { LanguageFooter } from "@/components/layout/language-footer";
import { TopNav } from "@/components/layout/top-nav";
import { getPlatformBrand } from "@/server/platform-settings";
import "./globals.css";

export const metadata: Metadata = {
  title: "C’est ma table",
  description: "Réservation, gestion des tables et opérations restaurant en temps réel.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico"
  }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const brand = await getPlatformBrand();

  return (
    <html lang="fr">
      <body>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <header className="border-b border-ink/10 bg-white/85 backdrop-blur">
              <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                <Link href="/" className="inline-flex min-w-0 items-center" aria-label="C’est ma table">
                  <BrandLogo initialBrand={brand} />
                </Link>
                <TopNav />
              </div>
            </header>
            <main className="flex-1">{children}</main>
            <LanguageFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
