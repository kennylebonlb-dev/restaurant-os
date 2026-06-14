import type { Metadata } from "next";
import { Providers } from "@/app/providers";
import { AppShell } from "@/components/layout/app-shell";
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
          <AppShell brand={brand}>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
