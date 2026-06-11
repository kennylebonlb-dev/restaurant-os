import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Providers } from "@/app/providers";
import { LanguageFooter } from "@/components/layout/language-footer";
import { TopNav } from "@/components/layout/top-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmarTable",
  description: "Réservation, gestion des tables et opérations restaurant en temps réel."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <header className="border-b border-ink/10 bg-white/85 backdrop-blur">
              <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                <Link href="/" className="inline-flex items-center gap-2 text-lg font-black text-ink">
                  <Image src="/smartable-logo.svg" alt="" width={36} height={36} className="rounded-md" />
                  SmarTable
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
