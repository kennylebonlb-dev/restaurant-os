import type { Metadata } from "next";
import { Providers } from "@/app/providers";
import { AppShell } from "@/components/layout/app-shell";
import { defaultPlatformBrand, getPlatformBrand } from "@/server/platform-settings";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getPlatformBrand().catch(() => defaultPlatformBrand);

  return {
    title: "ToqueTop | Sites et réservations pour restaurants",
    description: "Créez votre site restaurant, gérez les réservations, le plan de salle et les disponibilités en temps réel.",
    icons: {
      icon: brand.faviconUrl,
      shortcut: brand.faviconUrl
    }
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const brand = await getPlatformBrand().catch(() => defaultPlatformBrand);

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
