import { DashboardLive } from "@/components/dashboard/dashboard-live";
import { defaultPlatformBrand, getPlatformBrand } from "@/server/platform-settings";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const brand = await getPlatformBrand().catch(() => defaultPlatformBrand);

  return <DashboardLive initialBrand={brand} />;
}
